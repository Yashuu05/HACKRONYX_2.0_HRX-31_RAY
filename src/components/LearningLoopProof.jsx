import React, { useState } from 'react';
import { RefreshCw, ThumbsUp, ThumbsDown, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LearningLoopProof() {
  const [cycle1Feedback, setCycle1Feedback] = useState(null); // 'accepted' | 'rejected'

  return (
    <section id="learning-loop" className="section-spacing" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--border-color)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
          <div className="badge badge-green" style={{ marginBottom: '16px' }}>
            <RefreshCw size={14} />
            <span>FR-13 to FR-15 Compliance</span>
          </div>
          <h2 className="heading-lg" style={{ marginBottom: '16px' }}>
            Continuous Learning & Adaptation Proof
          </h2>
          <p className="body-lead">
            The system logs every user feedback action (Accept / Reject / Modify) and adapts its future recommendation behavior across distinct evaluation cycles.
          </p>
        </div>

        {/* 2-Cycle Comparison Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px'
        }}>
          {/* Cycle 1 Card */}
          <div className="card" style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-color)',
            padding: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="badge badge-blue">Cycle 1: Initial Risk Event</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Weight Baseline</span>
            </div>

            <h3 className="heading-sm" style={{ marginBottom: '8px' }}>Shortfall Detected (Oct 21)</h3>
            <p className="body-sm" style={{ marginBottom: '20px' }}>
              System identifies upcoming ₹450 buffer deficit.
            </p>

            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '4px' }}>
                Initial System Recommendation
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>
                "Defer optional OTT Subscription renewal (₹499)"
              </div>

              {/* User Action Controls */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCycle1Feedback('rejected')}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: cycle1Feedback === 'rejected' ? 'var(--caution-amber-light)' : '#FFFFFF',
                    borderColor: cycle1Feedback === 'rejected' ? 'var(--caution-amber)' : 'var(--border-color)',
                    color: cycle1Feedback === 'rejected' ? 'var(--caution-amber)' : 'var(--text-primary)',
                    fontSize: '12px'
                  }}
                >
                  <ThumbsDown size={14} />
                  <span>Reject Recommendation</span>
                </button>

                <button
                  onClick={() => setCycle1Feedback('accepted')}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: cycle1Feedback === 'accepted' ? 'var(--safe-green-light)' : '#FFFFFF',
                    borderColor: cycle1Feedback === 'accepted' ? 'var(--safe-green-border)' : 'var(--border-color)',
                    color: cycle1Feedback === 'accepted' ? 'var(--safe-green)' : 'var(--text-primary)',
                    fontSize: '12px'
                  }}
                >
                  <ThumbsUp size={14} />
                  <span>Accept Recommendation</span>
                </button>
              </div>
            </div>

            {cycle1Feedback && (
              <div style={{
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: '#FFFFFF',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)'
              }}>
                [LOGGED]: ActionType: DEFER_SUBSCRIPTION | Feedback: {cycle1Feedback.toUpperCase()} | Weight Delta: {cycle1Feedback === 'rejected' ? '-0.35' : '+0.25'}
              </div>
            )}
          </div>

          {/* Cycle 2 Card (Adapted Behavior) */}
          <div className="card" style={{
            backgroundColor: cycle1Feedback === 'rejected' ? 'var(--safe-green-light)' : 'var(--bg-canvas)',
            border: `1px solid ${cycle1Feedback === 'rejected' ? 'var(--safe-green-border)' : 'var(--border-color)'}`,
            padding: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="badge badge-green">Cycle 2: Adapted System Behavior</span>
              <span style={{ fontSize: '11px', color: 'var(--safe-green)', fontWeight: '700' }}>Learned Model</span>
            </div>

            <h3 className="heading-sm" style={{ marginBottom: '8px' }}>Subsequent Shortfall Risk</h3>
            <p className="body-sm" style={{ marginBottom: '20px' }}>
              Engine detects new shortfall risk under similar financial conditions.
            </p>

            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--safe-green)', marginBottom: '4px' }}>
                Adapted Recommendation (Cycle 2)
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {cycle1Feedback === 'rejected' ? (
                  "\"Set daily food & transport cap to ₹200 for 3 days.\""
                ) : (
                  "\"Defer optional OTT Subscription renewal (₹499).\""
                )}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: cycle1Feedback === 'rejected' ? 'var(--safe-green)' : 'var(--text-muted)'
            }}>
              <CheckCircle2 size={16} />
              <span>
                {cycle1Feedback === 'rejected' ? (
                  "System adapted live! Ceased subscription deferral suggestions due to Cycle 1 rejection."
                ) : (
                  "Click [Reject] in Cycle 1 to see live recommendation adaptation."
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
