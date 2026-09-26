import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, User, ShieldCheck, ArrowRight, HelpCircle, 
  ThumbsUp, ThumbsDown, Check, X, RefreshCw, MessageSquare, Trash2
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const INIT_MESSAGE = {
  id: 'init-1',
  sender: 'bot',
  text: "Hello! I am your LangChain-powered SPECIFY Assistant. I track your real-time liquidity forecasts, protected bill commitments, and Safe-to-Spend limits from Neon PostgreSQL. How can I assist you today?",
  traceId: 'TR-LC-INIT',
  modelUsed: 'LangChain Agent',
  feedbackStatus: null,
  chatId: null
};

// Cleanly format markdown bold, bullet lists, and currency values for enhanced clarity
function renderFormattedContent(text, isUser = false) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} style={{ height: '4px' }} />;
        }

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const cleanLine = isBullet ? trimmed.slice(2) : trimmed;

        // Parse **bold** markers
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2);
            const isAmount = boldText.includes('₹') || boldText.toLowerCase().includes('safe-to-spend');
            return (
              <strong 
                key={pIdx} 
                style={{ 
                  fontWeight: '700', 
                  color: isUser ? '#FFFFFF' : (isAmount ? '#1D4ED8' : 'inherit'),
                  backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : (isAmount ? '#EFF6FF' : 'transparent'),
                  padding: isAmount ? '1px 5px' : '0',
                  borderRadius: isAmount ? '4px' : '0'
                }}
              >
                {boldText}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingLeft: '2px' }}>
              <span style={{ color: isUser ? '#FFFFFF' : 'var(--brand-blue)', fontWeight: 'bold', fontSize: '15px', lineHeight: '1.5' }}>•</span>
              <span style={{ flex: 1, lineHeight: '1.5' }}>{renderedParts}</span>
            </div>
          );
        }

        return (
          <div key={lineIdx} style={{ lineHeight: '1.55' }}>
            {renderedParts}
          </div>
        );
      })}
    </div>
  );
}

export default function AIChatWidget({ initialQuery, currentUser }) {
  const userId = currentUser?.user_id || currentUser?.id || currentUser?.uid || 'usr-001';
  const [messages, setMessages] = useState([INIT_MESSAGE]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeFeedbackModal, setActiveFeedbackModal] = useState(null); // msgId | null
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Load persisted chat history from Neon PostgreSQL ai_chat table on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ai/chat/history/${userId}?limit=30`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          // Convert DB records (newest-first) to chat messages (oldest-first for display)
          const dbMessages = data.history.slice().reverse().flatMap((record, idx) => [
            {
              id: `hist-usr-${record.chat_id || idx}`,
              sender: 'user',
              text: record.user_query,
              chatId: record.chat_id
            },
            {
              id: `hist-bot-${record.chat_id || idx}`,
              sender: 'bot',
              text: record.ai_response,
              traceId: 'TR-LC-HISTORY',
              modelUsed: 'LangChain Agent',
              feedbackStatus: null,
              chatId: record.chat_id,
              safeToSpend: record.safe_to_spend_suggested,
              createdAt: record.created_at
            }
          ]);
          setMessages([INIT_MESSAGE, ...dbMessages]);
        }
      } catch (err) {
        console.warn('[AIChatWidget] Could not load chat history:', err);
      } finally {
        setHistoryLoaded(true);
      }
    };
    loadHistory();
  }, [userId]);

  useEffect(() => {
    if (initialQuery && historyLoaded) {
      handleSend(initialQuery);
    }
  }, [initialQuery, historyLoaded]);

  // Clear all chat history from Neon DB and reset UI
  const handleClearHistory = async () => {
    if (!window.confirm('Clear all AI conversation history from the database?')) return;
    setIsClearingHistory(true);
    try {
      await fetch(`${API_BASE}/api/ai/chat/history/${userId}`, { method: 'DELETE' });
      setMessages([INIT_MESSAGE]);
    } catch (err) {
      console.error('[AIChatWidget] Clear history error:', err);
    } finally {
      setIsClearingHistory(false);
    }
  };

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
                // Capture chat_id from done event for feedback linking
                if (data.chat_id) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === botMsgId
                        ? { ...msg, chatId: data.chat_id }
                        : msg
                    )
                  );
                }
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
                text: 'no data found',
                traceId: 'TR-LC-FALLBACK',
                modelUsed: 'Fallback Engine',
                isStreaming: false
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Submit user feedback to Neon PostgreSQL ai_feedback table (with chat_id linking)
  const handleFeedbackSubmit = async (msgId, action, comment = '') => {
    // Find the chatId stored on the message to properly link feedback
    const targetMsg = messages.find(m => m.id === msgId);
    const chatId = targetMsg?.chatId || null;
    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          chat_id: chatId,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: 'calc(100vh - 44px)', maxHeight: 'calc(100vh - 44px)', width: '100%', boxSizing: 'border-box' }}>
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
                <h1 className="heading-lg" style={{ fontSize: '22px', margin: 0, fontWeight: '800', color: '#0F172A' }}>
                  SPECIFY Assistant
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
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  color: 'var(--brand-blue)',
                  border: '1px solid #BFDBFE'
                }}>
                  📦 DB Persisted
                </span>
              </div>
              <p className="body-sm" style={{ color: 'var(--text-secondary)', margin: '2px 0 0 0', fontSize: '12px' }}>
                Conversations saved to Neon PostgreSQL · Real-time streaming · Feedback learning
              </p>
            </div>
          </div>
          {/* Clear History button */}
          <button
            onClick={handleClearHistory}
            disabled={isClearingHistory || isStreaming}
            title="Clear all conversation history from database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #FCA5A5',
              background: '#FFF5F5',
              color: '#EF4444',
              fontSize: '12px',
              fontWeight: '600',
              cursor: isClearingHistory || isStreaming ? 'not-allowed' : 'pointer',
              opacity: isClearingHistory || isStreaming ? 0.6 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={13} />
            {isClearingHistory ? 'Clearing...' : 'Clear History'}
          </button>
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '18px 20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', paddingRight: '8px' }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: m.sender === 'user' ? '75%' : '88%'
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
                  marginTop: '2px',
                  border: '1px solid #BFDBFE'
                }}>
                  <Bot size={18} />
                </div>
              )}

              <div style={{
                backgroundColor: m.sender === 'user' ? 'var(--brand-blue)' : '#F8FAFC',
                color: m.sender === 'user' ? '#FFFFFF' : '#1E293B',
                padding: '14px 18px',
                borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                border: m.sender === 'user' ? 'none' : '1px solid #E2E8F0',
                fontSize: '14px',
                lineHeight: '1.6',
                boxShadow: m.sender === 'user' ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {/* Formatted message text with bolding and bullet points */}
                <div>
                  {renderFormattedContent(m.text, m.sender === 'user')}
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
          padding: '10px 0',
          borderTop: '1px solid #F1F5F9',
          marginTop: '10px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              disabled={isStreaming}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                cursor: isStreaming ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                opacity: isStreaming ? 0.6 : 1,
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!isStreaming) {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                  e.currentTarget.style.color = 'var(--brand-blue)';
                  e.currentTarget.style.borderColor = '#BFDBFE';
                }
              }}
              onMouseLeave={(e) => {
                if (!isStreaming) {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isStreaming ? '#F1F5F9' : '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #E2E8F0',
            padding: '2px 14px',
            transition: 'border-color 0.2s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <input
              type="text"
              placeholder="Ask Guardian AI about trip affordability, spendings, or savings..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isStreaming}
              style={{
                flex: 1,
                padding: '10px 4px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                backgroundColor: 'transparent',
                color: '#0F172A'
              }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isStreaming || !inputQuery.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: '#FFFFFF',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isStreaming || !inputQuery.trim() ? 0.6 : 1,
              cursor: isStreaming || !inputQuery.trim() ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              border: 'none',
              fontFamily: 'inherit'
            }}
          >
            <span>{isStreaming ? 'Streaming...' : 'Ask AI'}</span>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

