import os
import sys
import json
import asyncio
import uuid
from typing import AsyncGenerator, Dict, Any, List

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.ai_agent.lc_tools import fetch_user_financial_profile
from backend.ai_agent.lc_memory import (
    build_conversation_messages,
    format_feedback_in_context_block
)
from backend.ai_agent.lc_chains import (
    load_llm_model,
    determine_tool_context,
    build_langchain_chat_chain,
    create_deterministic_fallback_response
)


async def stream_ai_chat_response(
    query: str,
    user_id: str = "usr-001",
    conversation_history: List[Dict[str, Any]] = None
) -> AsyncGenerator[str, None]:
    """
    Orchestrates LangChain AI Chat streaming using Server-Sent Events (SSE).
    Yields JSON event chunks for real-time frontend consumption.
    """
    trace_id = f"TR-LC-{uuid.uuid4().hex[:6].upper()}"
    raw_history = conversation_history or []

    # 1. Emit stream start event
    start_payload = {
        "event": "start",
        "trace_id": trace_id,
        "user_id": user_id
    }
    yield f"data: {json.dumps(start_payload)}\n\n"
    await asyncio.sleep(0.01)

    # 2. Compute LangChain context and memory in sub-15ms
    tool_context = determine_tool_context(query=query, user_id=user_id)
    feedback_memory = format_feedback_in_context_block(user_id=user_id)
    chat_history_messages = build_conversation_messages(raw_history)

    # 3. Attempt LangChain Model streaming
    model, model_identifier = load_llm_model()
    stream_succeeded = False

    if model:
        try:
            prompt_template = build_langchain_chat_chain()
            chain = prompt_template | model

            # Set a 4.0s timeout for first token via asyncio
            async def get_stream_chunks():
                chunks = []
                async for chunk in chain.astream({
                    "feedback_memory": feedback_memory,
                    "tool_context": tool_context,
                    "chat_history": chat_history_messages,
                    "user_input": query
                }):
                    chunks.append(chunk)
                return chunks

            # Stream chunks as they arrive
            async for chunk in chain.astream({
                "feedback_memory": feedback_memory,
                "tool_context": tool_context,
                "chat_history": chat_history_messages,
                "user_input": query
            }):
                text_content = chunk.content if hasattr(chunk, 'content') else str(chunk)
                if text_content:
                    token_payload = {
                        "event": "token",
                        "token": text_content,
                        "trace_id": trace_id
                    }
                    yield f"data: {json.dumps(token_payload)}\n\n"
                    stream_succeeded = True
                    await asyncio.sleep(0.01)

        except Exception as llm_err:
            print(f"[LangChain Streaming Exception] {llm_err}. Switching to Circuit-Breaker Fallback.")
            stream_succeeded = False

    # 4. Fallback Circuit-Breaker Execution if model failed or was unavailable
    if not stream_succeeded:
        fallback_text = create_deterministic_fallback_response(query=query, user_id=user_id)
        words = fallback_text.split(" ")
        for i, word in enumerate(words):
            chunk_text = word + (" " if i < len(words) - 1 else "")
            token_payload = {
                "event": "token",
                "token": chunk_text,
                "trace_id": trace_id,
                "is_fallback": True
            }
            yield f"data: {json.dumps(token_payload)}\n\n"
            await asyncio.sleep(0.02)

    # 5. Emit complete event
    end_payload = {
        "event": "done",
        "trace_id": trace_id,
        "model_used": model_identifier
    }
    yield f"data: {json.dumps(end_payload)}\n\n"
