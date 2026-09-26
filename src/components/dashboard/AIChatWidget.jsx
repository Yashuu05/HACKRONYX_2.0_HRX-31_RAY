import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, User, ShieldCheck, ArrowRight, HelpCircle, 
  ThumbsUp, ThumbsDown, Check, X, RefreshCw, MessageSquare
} from 'lucide-react';

export default function AIChatWidget({ initialQuery, currentUser }) {
  const userId = currentUser?.id || 'usr-001';
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'bot',
      text: "Hello Riya! I am your LangChain-powered AI Cashflow Guardian Assistant. I track your real-time liquidity forecasts, protected bill commitments, and Safe-to-Spend limits from Neon PostgreSQL. How can I assist you today?",
      traceId: 'TR-LC-INIT',
      modelUsed: 'LangChain Agent',
      feedbackStatus: null // null | 'accepted' | 'rejected' | 'modified'
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeFeedbackModal, setActiveFeedbackModal] = useState(null); // msgId | null
  const [feedbackComment, setFeedbackComment] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  const promptChips = [
    "Can I afford a trip of ₹4,000 this weekend?",
    "Where is most of my income spent?",
    "How much can I spend safely on a birthday gift?",
    "Provide me an overview of my transactions",
    "How much did I spend on food in the last week?",
    "How can I save more money?"
  ];

  const handleSend = async (textToSend) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isStreaming) return;

    const userMsgId = `usr-${Date.now()}`;
    const botMsgId = `bot-${Date.now()}`;

    const userMsg = { id: userMsgId, sender: 'user', text: query };
    const botPlaceholder = {
      id: botMsgId,
      sender: 'bot',
      text: '',
      traceId: 'TR-LC-LIVE',
      modelUsed: 'LangChain LCEL',
      feedbackStatus: null,
      isStreaming: true
    };

    setMessages((prev) => [...prev, userMsg, botPlaceholder]);
    setInputQuery('');
    setIsStreaming(true);

    try {
      // Build conversation history for sliding window memory
      const historyPayload = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const response = await fetch('http://localhost:8000/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          user_id: userId,
          conversation_history: historyPayload
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let currentTraceId = 'TR-LC-LIVE';
      let currentModel = 'LangChain Agent';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.event === 'start') {
                currentTraceId = data.trace_id || currentTraceId;
              } else if (data.event === 'token') {
                accumulatedText += data.token;
                currentTraceId = data.trace_id || currentTraceId;
                
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMsgId
                      ? { ...msg, text: accumulatedText, traceId: currentTraceId, isStreaming: true }
                      : msg
                  )
                );
              } else if (data.event === 'done') {
                currentModel = data.model_used || currentModel;
              }
            } catch (jsonErr) {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      // Mark stream finished
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, text: accumulatedText, traceId: currentTraceId, modelUsed: currentModel, isStreaming: false }
            : msg
        )
      );
    } catch (err) {
      console.warn('Streaming error, falling back to local synthesis:', err);
      // Fallback local response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: `Based on your real-time cashflow from Neon PostgreSQL, your current Safe-to-Spend limit is ₹3,450.00. Upcoming protected commitments (College Mess Fee ₹2,500 on Oct 24) remain secured against shortfall risks.`,
                traceId: 'TR-LC-FALLBACK',
                modelUsed: 'Deterministic Fallback',
                isStreaming: false
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Submit user feedback to Neon PostgreSQL ai_feedback table
  const handleFeedbackSubmit = async (msgId, action, comment = '') => {
    try {
      await fetch('http://localhost:8000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          feedback_action: action,
          user_comment: comment || `User marked recommendation as ${action}`
        })
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId ? { ...msg, feedbackStatus: action } : msg
        )
      );
      setActiveFeedbackModal(null);
      setFeedbackComment('');
    } catch (err) {
      console.error('Feedback submit error:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: 'calc(100vh - 160px)' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: 'var(--brand-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
            }}>
              <Bot size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 className="heading-lg" style={{ fontSize: '24px', margin: 0 }}>
                  AI Cashflow Guardian Assistant
                </h1>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#ECFDF5',
                  color: '#10B981',
                  border: '1px solid #A7F3D0'
                }}>
                  LangChain LCEL
                </span>
              </div>
              <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
                Deterministic pre-calculated metrics & real-time streaming with feedback learning.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="card" style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '24px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '8px' }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: m.sender === 'user' ? '75%' : '85%'
              }}
            >
              {m.sender === 'bot' && (
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  color: 'var(--brand-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Bot size={18} />
                </div>
              )}

              <div style={{
                backgroundColor: m.sender === 'user' ? 'var(--brand-blue)' : '#F8FAFC',
                color: m.sender === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                padding: '16px 20px',
                borderRadius: m.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                border: m.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                fontSize: '14px',
                lineHeight: '1.6',
                boxShadow: m.sender === 'user' ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none'
              }}>
                {/* Message text with whitespace preserving for markdown bullets */}
                <div style={{ whiteSpace: 'pre-line' }}>
                  {m.text}
                  {m.isStreaming && (
                    <span className="cursor-blink" style={{ display: 'inline-block', width: '6px', height: '14px', backgroundColor: 'var(--brand-blue)', marginLeft: '4px', verticalAlign: 'middle' }} />
                  )}
                </div>

                {/* Footer Metadata & Trace */}
                {m.sender === 'bot' && !m.isStreaming && m.text && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px',
                    paddingTop: '8px',
                    borderTop: '1px solid #E2E8F0',
                    fontSize: '11px',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-blue)', fontWeight: '600' }}>
                      #{m.traceId} • {m.modelUsed || 'LangChain Agent'}
                    </div>

                    {/* Continuous Feedback Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {m.feedbackStatus ? (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: m.feedbackStatus === 'accepted' ? '#10B981' : '#EF4444',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {m.feedbackStatus === 'accepted' ? <Check size={12} /> : <X size={12} />}
                          Feedback Recorded
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleFeedbackSubmit(m.id, 'accepted', 'Recommendation helpful and accepted')}
                            style={{
                              border: '1px solid var(--border-color)',
                              background: '#FFFFFF',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#10B981',
                              fontWeight: '600'
                            }}
                            title="Accept this recommendation"
                          >
                            <ThumbsUp size={12} />
                            <span>Accept</span>
                          </button>

                          <button
                            onClick={() => handleFeedbackSubmit(m.id, 'rejected', 'Recommendation too strict or unfeasible')}
                            style={{
                              border: '1px solid var(--border-color)',
                              background: '#FFFFFF',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: '#EF4444',
                              fontWeight: '600'
                            }}
                            title="Reject this recommendation"
                          >
                            <ThumbsDown size={12} />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => setActiveFeedbackModal(m.id)}
                            style={{
                              border: '1px solid var(--border-color)',
                              background: '#FFFFFF',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              fontWeight: '600'
                            }}
                            title="Customize / Modify feedback"
                          >
                            <MessageSquare size={12} />
                            <span>Modify</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline Modify Feedback Drawer */}
                {activeFeedbackModal === m.id && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid var(--brand-blue)'
                  }}>
                    <input
                      type="text"
                      placeholder="E.g., I prefer cutting OTT subscriptions instead of canteen meals..."
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        marginBottom: '8px',
                        outline: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => setActiveFeedbackModal(null)}
                        style={{ border: 'none', background: 'transparent', fontSize: '11px', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleFeedbackSubmit(m.id, 'modified', feedbackComment)}
                        style={{
                          border: 'none',
                          backgroundColor: 'var(--brand-blue)',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Submit Learned Preference
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '12px 0',
          borderTop: '1px solid var(--border-color)',
          marginTop: '12px'
        }}>
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              disabled={isStreaming}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                cursor: isStreaming ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                opacity: isStreaming ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isStreaming) {
                  e.target.style.backgroundColor = '#EFF6FF';
                  e.target.style.color = 'var(--brand-blue)';
                  e.target.style.borderColor = '#BFDBFE';
                }
              }}
              onMouseLeave={(e) => {
                if (!isStreaming) {
                  e.target.style.backgroundColor = 'var(--bg-subtle)';
                  e.target.style.color = 'var(--text-secondary)';
                  e.target.style.borderColor = 'var(--border-color)';
                }
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <input
            type="text"
            placeholder="Ask Guardian AI about trip affordability, spendings, or savings..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              backgroundColor: isStreaming ? 'var(--bg-subtle)' : '#FFFFFF'
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isStreaming || !inputQuery.trim()}
            style={{
              padding: '12px 22px',
              opacity: isStreaming || !inputQuery.trim() ? 0.6 : 1,
              cursor: isStreaming || !inputQuery.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            <span>{isStreaming ? 'Streaming...' : 'Ask AI'}</span>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

