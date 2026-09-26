import React, { useState } from 'react';
import { TrendingUp, ShieldCheck, Sliders, Equal, Minus, CheckCircle, AlertOctagon } from 'lucide-react';

export default function SafeToSpendVisualizer() {
  const [lowestBalance, setLowestBalance] = useState(5200);
  const [protectedCommitments, setProtectedCommitments] = useState(1200);
  const [safetyBuffer, setSafetyBuffer] = useState(550);

  const safeToSpend = lowestBalance - protectedCommitments - safetyBuffer;
  const isHealthy = safeToSpend > 0;

  return (
    <section id="safe-to-spend" className="section-spacing" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--border-color)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
          <div className="badge badge-green" style={{ marginBottom: '16px' }}>
            <CheckCircle size={14} />
            <span>Auditable Deterministic Engine</span>
          </div>
          <h2 className="heading-lg" style={{ marginBottom: '16px' }}>
            Clear, Auditable Math. No Black-Box Guesswork.
          </h2>
          <p className="body-lead">
            Your Safe-to-Spend limit isn't just your current bank balance. It is mathematically computed to guarantee you never miss rent, mess fees, or essential debits.
          </p>
        </div>

        {/* Interactive Formula Card */}
        <div className="card" style={{
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          padding: '36px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--brand-blue)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Interactive Live Formula Sandbox — Try Dragging Sliders Below
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1.2fr',
            gap: '16px',
            alignItems: 'center'
          }}>
            {/* Component 1: Lowest Balance */}
            <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--brand-blue)' }}>
                <TrendingUp size={20} />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>Lowest Projected Balance</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
                ₹ {lowestBalance.toLocaleString()}
              </div>
              <input
                type="range"
                min="2000"
                max="12000"
                step="100"
                value={lowestBalance}
                onChange={(e) => setLowestBalance(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-blue)', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Minimum point in 7–14 day forecast
              </div>
            </div>

            {/* Operator: Minus */}
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Minus size={28} strokeWidth={2.5} />
            </div>

            {/* Component 2: Protected Commitments */}
            <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--safe-green)' }}>
                <ShieldCheck size={20} />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>Protected Commitments</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
                ₹ {protectedCommitments.toLocaleString()}
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={protectedCommitments}
                onChange={(e) => setProtectedCommitments(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--safe-green)', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Reserved for Rent, Mess & Bills
              </div>
            </div>

            {/* Operator: Minus */}
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Minus size={28} strokeWidth={2.5} />
            </div>

            {/* Component 3: Safety Buffer */}
            <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--caution-amber)' }}>
                <Sliders size={20} />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>Safety Buffer</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px' }}>
                ₹ {safetyBuffer.toLocaleString()}
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="50"
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--caution-amber)', cursor: 'pointer' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Emergency cushion padding
              </div>
            </div>

            {/* Operator: Equals */}
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Equal size={28} strokeWidth={2.5} />
            </div>

            {/* Result: Dynamic Safe-to-Spend */}
            <div className="card" style={{
              backgroundColor: isHealthy ? 'var(--safe-green-light)' : 'var(--caution-amber-light)',
              border: `2px solid ${isHealthy ? 'var(--safe-green-border)' : 'var(--caution-amber-border)'}`,
              padding: '24px',
              textAlign: 'center'
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: isHealthy ? 'var(--safe-green)' : 'var(--caution-amber)'
              }}>
                {isHealthy ? 'Safe-to-Spend Today' : 'Buffer Deficit Alert'}
              </span>
              <div style={{
                fontSize: '32px',
                fontWeight: '800',
                color: isHealthy ? 'var(--safe-green)' : 'var(--caution-amber)',
                marginTop: '4px'
              }}>
                ₹ {safeToSpend.toLocaleString()}
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                {isHealthy ? (
                  <>
                    <CheckCircle size={14} color="var(--safe-green)" />
                    <span>Protected funds guaranteed</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon size={14} color="var(--caution-amber)" />
                    <span>Breaches buffer by ₹{Math.abs(safeToSpend).toLocaleString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
