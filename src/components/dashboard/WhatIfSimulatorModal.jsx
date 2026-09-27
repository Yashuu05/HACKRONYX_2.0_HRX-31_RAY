import React, { useState, useEffect } from 'react';
import {
  Sparkles, X, ShieldCheck, AlertTriangle, ShieldAlert,
  Calendar, DollarSign, Clock, ArrowRight, TrendingDown,
  Info, Sliders, CheckCircle2, ChevronRight
} from 'lucide-react';

const PRESET_AMOUNTS = [500, 1500, 3000, 4500, 8000];

const CATEGORIES = [
  'Shopping',
  'Food & Dining',
  'Electronics',
  'Travel & Outing',
  'Entertainment',
  'Personal Care',
  'Other'
];

export default function WhatIfSimulatorModal({ isOpen, onClose, activeUserId, currentNetBalance = 0 }) {
  const [amount, setAmount] = useState('2500');
  const [category, setCategory] = useState('Shopping');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && !result && amount) {
      handleSimulate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid purchase amount greater than zero.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:8000/api/simulation/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: activeUserId || 'usr-001',
          amount: numAmount,
          category: category,
          description: description.trim() || undefined,
          horizon_days: 14
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned error ${res.status}`);
      }

      const data = await res.json();
      if (data.status === 'no_data') {
        setError('no data available in your database. Please record initial transactions first.');
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.warn('What-If simulation request notice:', err);
      setError('Could not run simulation. Please ensure your backend server is active.');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictTheme = (verdict) => {
    switch (verdict) {
      case 'SAFE_TO_SWIPE':
        return {
          bg: '#ECFDF5',
          border: '#6EE7B7',
          text: '#065F46',
          badgeBg: '#D1FAE5',
          badgeText: '#047857',
          icon: ShieldCheck,
          accent: '#10B981'
        };
      case 'PROCEED_WITH_CAUTION':
        return {
          bg: '#FFFBEB',
          border: '#FCD34D',
          text: '#92400E',
          badgeBg: '#FEF3C7',
          badgeText: '#B45309',
          icon: AlertTriangle,
          accent: '#F59E0B'
        };
      case 'CRITICAL_SHORTFALL_RISK':
      default:
        return {
          bg: '#FEF2F2',
          border: '#FCA5A5',
          text: '#991B1B',
          badgeBg: '#FEE2E2',
          badgeText: '#B91C1C',
          icon: ShieldAlert,
          accent: '#EF4444'
        };
    }
  };

  const theme = result ? getVerdictTheme(result.verdict) : null;
  const VerdictIcon = theme ? theme.icon : Sparkles;

  // Compute SVG chart dimensions and coordinates
  const trajectory = result?.dual_trajectory || [];
  const chartWidth = 620;
  const chartHeight = 160;
  const padding = { top: 20, right: 30, bottom: 25, left: 55 };

  let minVal = 0;
  let maxVal = 10000;
  if (trajectory.length > 0) {
    const allVals = trajectory.flatMap(d => [d.baseline_balance, d.simulated_balance, d.safety_buffer]);
    minVal = Math.min(0, ...allVals);
    maxVal = Math.max(1000, ...allVals);
  }
  const valRange = maxVal - minVal || 1;

  const getX = (idx) => padding.left + (idx / Math.max(1, trajectory.length - 1)) * (chartWidth - padding.left - padding.right);
  const getY = (val) => chartHeight - padding.bottom - ((val - minVal) / valRange) * (chartHeight - padding.top - padding.bottom);

  const baselinePoints = trajectory.map((d, i) => `${getX(i)},${getY(d.baseline_balance)}`).join(' ');
  const simulatedPoints = trajectory.map((d, i) => `${getX(i)},${getY(d.simulated_balance)}`).join(' ');
  const bufferY = trajectory.length > 0 ? getY(trajectory[0].safety_buffer) : getY(3000);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '720px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  What-If Pre-Purchase Simulator
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#6366F1',
                  backgroundColor: '#EEF2FF',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #C7D2FE'
                }}>
                  SAFE-TO-SWIPE
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                Test prospective discretionary purchases before swiping to preview 14-day balance trajectory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Input Controls Form */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  PROSPECTIVE AMOUNT (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '15px', fontWeight: '700', color: '#64748B' }}>₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 30px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#0F172A',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  CATEGORY
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0F172A',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box'
                  }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick preset amount chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>Presets:</span>
              {PRESET_AMOUNTS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { setAmount(String(preset)); }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: amount === String(preset) ? '#3B82F6' : '#E2E8F0',
                    backgroundColor: amount === String(preset) ? '#EFF6FF' : '#FFFFFF',
                    color: amount === String(preset) ? '#2563EB' : '#475569',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ₹{preset.toLocaleString()}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={handleSimulate}
                disabled={loading}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Simulating...' : (
                  <>
                    <span>Run Simulation</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {error}
            </div>
          )}

          {/* Simulation Output Card */}
          {result && theme && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Verdict Header Banner */}
              <div style={{
                backgroundColor: theme.bg,
                border: `1px solid ${theme.border}`,
                borderRadius: '16px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    backgroundColor: theme.badgeBg,
                    color: theme.badgeText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${theme.border}`
                  }}>
                    <VerdictIcon size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: theme.text }}>
                        {result.verdict_title}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        backgroundColor: theme.badgeBg,
                        color: theme.badgeText,
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        SCORE {result.safe_to_swipe_score}/100
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: theme.text, margin: '4px 0 0 0', opacity: 0.9 }}>
                      {result.verdict_message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dual Trajectory Visualizer */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                    14-Day Dual-Timeline Trajectory Bifurcation
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', fontWeight: '700' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#2563EB' }}>
                      <div style={{ width: '12px', height: '3px', backgroundColor: '#2563EB', borderRadius: '2px' }} />
                      <span>Baseline (No Purchase)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#EC4899' }}>
                      <div style={{ width: '12px', height: '3px', borderTop: '3px dashed #EC4899' }} />
                      <span>Simulated (-₹{result.amount.toLocaleString()})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#DC2626' }}>
                      <div style={{ width: '12px', height: '2px', borderTop: '2px dotted #DC2626' }} />
                      <span>Safety Buffer</span>
                    </div>
                  </div>
                </div>

                {/* SVG Chart */}
                <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1={padding.left} y1={getY(minVal)} x2={chartWidth - padding.right} y2={getY(minVal)} stroke="#F1F5F9" strokeWidth="1" />
                  <line x1={padding.left} y1={getY(maxVal)} x2={chartWidth - padding.right} y2={getY(maxVal)} stroke="#F1F5F9" strokeWidth="1" />

                  {/* Safety Buffer Reference Line */}
                  <line
                    x1={padding.left}
                    y1={bufferY}
                    x2={chartWidth - padding.right}
                    y2={bufferY}
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <text x={padding.left - 6} y={bufferY + 4} textAnchor="end" fontSize="10" fill="#EF4444" fontWeight="700">
                    Buffer ₹{Math.round(result.safety_buffer).toLocaleString()}
                  </text>

                  {/* Baseline Polyline */}
                  <polyline
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={baselinePoints}
                  />

                  {/* Simulated Polyline */}
                  <polyline
                    fill="none"
                    stroke="#EC4899"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={simulatedPoints}
                  />

                  {/* Date labels on X-axis */}
                  {trajectory.map((d, i) => {
                    if (i === 0 || i === 4 || i === 9 || i === trajectory.length - 1) {
                      return (
                        <text
                          key={d.day}
                          x={getX(i)}
                          y={chartHeight - 6}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#94A3B8"
                          fontWeight="600"
                        >
                          {d.label}
                        </text>
                      );
                    }
                    return null;
                  })}
                </svg>
              </div>

              {/* 3 Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                    POST-PURCHASE BALANCE
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: result.simulated_balance < result.safety_buffer ? '#DC2626' : '#0F172A', marginTop: '2px' }}>
                    ₹{result.simulated_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    Down from ₹{result.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                    BUFFER BREACH TIMING
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: result.days_to_breach !== null ? '#DC2626' : '#10B981', marginTop: '2px' }}>
                    {result.days_to_breach === null ? 'None (Safe)' : result.days_to_breach === 0 ? 'Today (Immediate)' : `Day ${result.days_to_breach}`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    {result.max_deficit > 0 ? `Deficit: ₹${result.max_deficit.toLocaleString()}` : 'Buffer stays intact'}
                  </div>
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                    SAFE PRICE CEILING
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563EB', marginTop: '2px' }}>
                    ₹{result.safe_price_ceiling.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    Max safe spend today
                  </div>
                </div>
              </div>

              {/* AI Smart Compromise (Groq Grounded) */}
              {result.smart_compromise && (
                <div style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <div style={{ color: '#2563EB', marginTop: '2px' }}>
                    <Sliders size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase', marginBottom: '2px' }}>
                      AI Copilot Compromise Strategy
                    </div>
                    <p style={{ fontSize: '13px', color: '#1E3A8A', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>
                      {result.smart_compromise.recommendation}
                    </p>
                    {result.smart_compromise.delay_days && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#1D4ED8', fontWeight: '700' }}>
                        <Clock size={13} />
                        <span>Recommended Delay: Postpone by {result.smart_compromise.delay_days} day(s) until scheduled income arrives</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAFAFA'
        }}>
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={14} />
            <span>Simulated calculations are strictly read-only and will not modify your database records.</span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
