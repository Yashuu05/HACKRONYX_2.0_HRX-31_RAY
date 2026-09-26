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
    After streaming completes, saves the full conversation turn to the
    Neon PostgreSQL `ai_chat` table as specified in data_model.md.
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
    full_response_text = ""  # Accumulate complete AI response for DB persistence

    if model:
        try:
            prompt_template = build_langchain_chat_chain()
            chain = prompt_template | model

            # Stream chunks as they arrive; accumulate into full_response_text
            async for chunk in chain.astream({
                "feedback_memory": feedback_memory,
                "tool_context": tool_context,
                "chat_history": chat_history_messages,
                "user_input": query
            }):
                text_content = ""
                if hasattr(chunk, 'content'):
                    content = chunk.content
                    if isinstance(content, str):
                        text_content = content
                    elif isinstance(content, list):
                        for part in content:
                            if isinstance(part, dict) and "text" in part:
                                text_content += part["text"]
                            elif isinstance(part, str):
                                text_content += part
                    else:
                        text_content = str(content)
                else:
                    text_content = str(chunk)

                if text_content:
                    full_response_text += text_content
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
        full_response_text = fallback_text
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

    # 5. Persist the completed conversation turn to Neon PostgreSQL ai_chat table
    #    Schema: chat_id (UUID PK), user_id (FK), user_query (TEXT),
    #            ai_response (TEXT), safe_to_spend_suggested (NUMERIC), created_at
    saved_chat_id = None
    if full_response_text.strip():
        try:
            import re

            # Extract safe_to_spend numeric value from AI response (if present)
            safe_to_spend_val = None
            sts_patterns = [
                r'[Ss]afe-to-[Ss]pend[^₹\d]*[₹Rs\.]*\s*([\d,]+\.?\d*)',
                r'safely spend[^₹\d]*[₹Rs\.]*\s*([\d,]+\.?\d*)',
                r'spend up to[^₹\d]*[₹Rs\.]*\s*([\d,]+\.?\d*)',
                r'[Ss]pend [Ll]imit[^₹\d]*[₹Rs\.]*\s*([\d,]+\.?\d*)',
            ]
            for pat in sts_patterns:
                m = re.search(pat, full_response_text, re.IGNORECASE)
                if m:
                    try:
                        safe_to_spend_val = float(m.group(1).replace(',', ''))
                    except ValueError:
                        pass
                    break

            from db.database import get_db_connection
            conn = get_db_connection()
            cur = conn.cursor()

            # Ensure user row exists to satisfy FK constraint (guard for new/auth users)
            cur.execute(
                """
                INSERT INTO users (user_id, name)
                VALUES (%s, %s)
                ON CONFLICT (user_id) DO NOTHING;
                """,
                (user_id, f"User {user_id}")
            )

            # Insert into ai_chat and return the generated chat_id UUID
            insert_sql = """
                INSERT INTO ai_chat (user_id, user_query, ai_response, safe_to_spend_suggested)
                VALUES (%s, %s, %s, %s)
                RETURNING chat_id;
            """
            cur.execute(insert_sql, (
                user_id,
                query,
                full_response_text,
                safe_to_spend_val
            ))
            row = cur.fetchone()
            saved_chat_id = str(row[0]) if row else None
            conn.commit()
            cur.close()
            conn.close()
            print(
                f"[ai_chat] Saved | chat_id={saved_chat_id} | user_id={user_id} | "
                f"safe_to_spend={safe_to_spend_val} | query_len={len(query)} | response_len={len(full_response_text)}"
            )
        except Exception as db_err:
            # DB persistence failure is non-fatal — streaming already delivered to user
            print(f"[ai_chat] DB persistence error (non-fatal): {db_err}")

    # 6. Emit done event — includes chat_id so frontend can link ai_feedback to this turn
    end_payload = {
        "event": "done",
        "trace_id": trace_id,
        "model_used": model_identifier,
        "chat_id": saved_chat_id  # Frontend must store this for feedback linking
    }
    yield f"data: {json.dumps(end_payload)}\n\n"
