import os
import sys
from typing import List, Dict, Any
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from db.database import get_db_connection
from psycopg2.extras import RealDictCursor


def fetch_user_feedback_history(user_id: str = "usr-001", limit: int = 5) -> List[Dict[str, Any]]:
    """Fetches recent user feedback actions (accepted, rejected, modified) from Neon PostgreSQL."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT feedback_action, user_comment, created_at
            FROM ai_feedback
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s;
            """,
            (user_id, limit)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"[Feedback Fetch Error] {e}")
        return []


def format_feedback_in_context_block(user_id: str = "usr-001") -> str:
    """Formats historical feedback into in-context learning guidelines for the prompt."""
    feedbacks = fetch_user_feedback_history(user_id, limit=4)
    if not feedbacks:
        return "No prior negative/positive feedback logged. Provide standard empathetic and mathematically strict recommendations."

    lines = ["Historical User Preferences Learned from Past Feedbacks:"]
    for fb in feedbacks:
        action = fb.get('feedback_action', 'modified')
        comment = fb.get('user_comment') or ''
        if action == 'accepted':
            lines.append(f"- [Accepted Advice]: User approved: '{comment}' (Continue offering similar proactive optimizations).")
        elif action == 'rejected':
            lines.append(f"- [Rejected Advice]: User rejected: '{comment}' (Avoid suggesting this strict constraint; offer alternative flexibility).")
        elif action == 'modified':
            lines.append(f"- [Modified Advice]: User customized: '{comment}'.")
    return "\n".join(lines)


def build_conversation_messages(raw_history: List[Dict[str, Any]]) -> List[BaseMessage]:
    """Converts a raw chat history list into LangChain BaseMessage objects."""
    messages: List[BaseMessage] = []
    # Take the last 8 turns for sliding window memory
    recent_turns = raw_history[-8:] if len(raw_history) > 8 else raw_history
    for msg in recent_turns:
        sender = msg.get('sender', 'user')
        text = msg.get('text', '')
        if not text.strip():
            continue
        if sender in ('user', 'human'):
            messages.append(HumanMessage(content=text))
        else:
            messages.append(AIMessage(content=text))
    return messages
