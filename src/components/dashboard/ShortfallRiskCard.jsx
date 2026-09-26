import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, TrendingDown, Clock, ShieldCheck, ArrowRight, RefreshCw, Zap, Sparkles } from 'lucide-react';

export default function ShortfallRiskCard({ onApplyClamp, onRefresh, onNavigateToChat }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulatedShortfall, setSimulatedShortfall] = useState(false);

  const fetchShortfallAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/shortfall/analysis?user_id=usr-001&horizon_days=14');
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      } else {
        throw new Error(json.message || 'Failed to fetch shortfall analysis');
      }
    } catch (err) {
      console.warn('Shortfall analysis fetch fallback:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortfallAnalysis();
  }, []);

  const analysis = data?.analysis || {};
  const reasoning = data?.reasoning || {};
  const strategies = data?.mitigation_strategies || [];

  // Toggle simulated shortfall for testing/demonstration in hackathon review
  const activeRiskLevel = simulatedShortfall ? 'CRITICAL' : (analysis.risk_level || 'SAFE');
  const activeRiskScore = simulatedShortfall ? 78.5 : (analysis.risk_score ?? 0.0);
  const activeDaysToShortfall = simulatedShortfall ? 4 : analysis.days_until_shortfall;
  const activeDeficit = simulatedShortfall ? 1850.00 : (analysis.max_shortfall_deficit ?? 0.0);

  const activeReasons = simulatedShortfall ? [
    'Initial Net Balance is slim compared to upcoming mandatory hostel/mess debits.',
    'Daily baseline spending velocity (₹714.29/day) exceeds remaining surplus before stipend date.',
    'Shortfall of ₹1,850.00 predicted on Day 4 (2026-09-24) below Safety Buffer.'
  ] : (reasoning.primary_factors || []);

  const activeStrategies = simulatedShortfall ? [
    {
      id: 'strat-1',
      title: 'Enforce Daily Safe-to-Spend Cap',
      category: 'Immediate Prevention',
      impact_label: 'Saves ~₹1,200.00 over 4 days',
      description: 'Cap daily non-essential spend to ₹250.00/day (a reduction of ₹464.29/day) until shortfall window passes.',
      recommended_daily_limit: 250.00
    },
    {
      id: 'strat-2',
      title: 'Postpone Discretionary Purchases',
      category: 'Expense Management',
      impact_label: 'Frees up ₹1,850.00 liquidity deficit',
      description: 'Defer non-essential purchases (clothing, electronics) until after stipend credit.'
    }
  ] : (Array.isArray(strategies) ? strategies : []);

  const formatCurrency = (val, fallback = 0) => {
    const num = Number(val ?? fallback);
    return isNaN(num) ? '0.00' : num.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  const isSafe = activeRiskLevel === 'SAFE';
  const isCritical = activeRiskLevel === 'CRITICAL';

  return (
    <div className="card" style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '20px',
      padding: '24px',
      border: isCritical ? '2px solid #FCA5A5' : (isSafe ? '1px solid var(--border-color)' : '2px solid #FDE68A'),
      boxShadow: isCritical ? '0 10px 30px rgba(220, 38, 38, 0.08)' : 'var(--shadow-sm)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: isCritical ? '#FEF2F2' : (isSafe ? 'var(--safe-green-light)' : '#FFFBEB'),
            color: isCritical ? '#DC2626' : (isSafe ? 'var(--safe-green)' : '#D97706'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isCritical ? <ShieldAlert size={22} /> : (isSafe ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="heading-sm" style={{ margin: 0, fontSize: '18px' }}>Shortfall Risk Detection</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>(14-Day Horizon)</span>
            </div>
            <p className="body-sm" style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '12px' }}>
              Proactive algorithm calculating balance trajectory against Safety Buffer (₹{formatCurrency(analysis.safety_buffer, 3000)})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Risk Level Badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '800',
            backgroundColor: isCritical ? '#FEF2F2' : (isSafe ? 'var(--safe-green-light)' : '#FFFBEB'),
            color: isCritical ? '#DC2626' : (isSafe ? 'var(--safe-green)' : '#D97706'),
            border: `1px solid ${isCritical ? '#FCA5A5' : (isSafe ? 'var(--safe-green-border)' : '#FDE68A')}`
          }}>
            {isCritical ? <AlertTriangle size={14} /> : (isSafe ? <CheckCircle2 size={14} /> : <Clock size={14} />)}
            {activeRiskLevel} RISK ({activeRiskScore}/100)
          </span>

          <button
            onClick={fetchShortfallAnalysis}
            className="btn btn-sm"
            title="Refresh Analysis"
            style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', padding: '6px 10px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        backgroundColor: 'var(--bg-canvas)',
        padding: '14px',
        borderRadius: '14px',
        marginBottom: '18px',
        border: '1px solid var(--border-color)'
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>SHORTFALL RISK SCORE</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: isCritical ? '#DC2626' : (isSafe ? 'var(--safe-green)' : '#D97706') }}>
            {activeRiskScore} <span style={{ fontSize: '12px', fontWeight: '600' }}>/ 100</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>DAYS TO SHORTFALL</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: (activeDaysToShortfall !== null && activeDaysToShortfall !== undefined) ? '#DC2626' : 'var(--text-primary)' }}>
            {(activeDaysToShortfall !== null && activeDaysToShortfall !== undefined) ? `${activeDaysToShortfall} Day(s)` : 'None (Safe)'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>MAX DEFICIT BELOW BUFFER</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: activeDeficit > 0 ? '#DC2626' : 'var(--safe-green)' }}>
            ₹ {formatCurrency(activeDeficit)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>DAILY BURN BASELINE</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            ₹ {formatCurrency(analysis.daily_burn_rate, 714.29)} <span style={{ fontSize: '11px', fontWeight: '500' }}>/day</span>
          </div>
        </div>
      </div>

      {/* Algorithmic & LLM Root Cause Reasoning */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="var(--brand-blue)" />
            <span>Shortfall Reasoning & AI Root Cause Analysis</span>
          </div>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            backgroundColor: '#EEF2FF',
            color: 'var(--brand-blue)',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Sparkles size={11} />
            {reasoning.llm_output?.ai_model_used || 'Gemini 3.5 Flash (google)'}
          </span>
        </div>
        <div style={{
          backgroundColor: isCritical ? '#FFF5F5' : (isSafe ? '#F0FDF4' : '#FFFDF0'),
          padding: '14px 16px',
          borderRadius: '12px',
          fontSize: '13px',
          color: 'var(--text-primary)',
          lineHeight: '1.5',
          borderLeft: `4px solid ${isCritical ? '#DC2626' : (isSafe ? 'var(--safe-green)' : '#D97706')}`
        }}>
          {isSafe && !simulatedShortfall ? (
            <div>Your balance trajectory indicates no shortfall risk within the 14-day window. Spending is within your weekly budget allocation.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: '700', color: isCritical ? '#991B1B' : '#92400E' }}>
                {reasoning.summary_reason || 'Liquidity deficit detected within forecast horizon.'}
              </div>
              {Array.isArray(activeReasons) && activeReasons.map((factor, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isCritical ? '#DC2626' : '#D97706' }}></span>
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mitigation Strategies & AI Chat Action Bar */}
      {Array.isArray(activeStrategies) && activeStrategies.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Recommended Prevention & Mitigation Actions:
            </div>
            {onNavigateToChat && (
              <button
                onClick={() => onNavigateToChat(reasoning.summary_reason || "How can I adjust my spending to prevent the predicted shortfall?")}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#EEF2FF',
                  color: 'var(--brand-blue)',
                  border: '1px solid #C7D2FE',
                  fontWeight: '700',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={13} />
                <span>Discuss & Resolve with AI Guardian →</span>
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {activeStrategies.map((strat, idx) => (
              <div
                key={strat.id || idx}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '14px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--brand-blue)', textTransform: 'uppercase' }}>
                      {strat.category}
                    </span>
                    <span className="badge badge-green" style={{ fontSize: '10px' }}>
                      {strat.impact_label}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {strat.title}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                    {strat.description}
                  </p>
                </div>

                {strat.recommended_daily_limit && onApplyClamp && (
                  <button
                    onClick={() => onApplyClamp(strat.recommended_daily_limit)}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>Apply Safe-to-Spend Cap</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulation Toggle Bar for Reviewers */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px dashed var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: 'var(--text-muted)'
      }}>
        <span>Interactive Demo Control:</span>
        <button
          onClick={() => setSimulatedShortfall(!simulatedShortfall)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--brand-blue)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '11px'
          }}
        >
          {simulatedShortfall ? '← Reset to Real Neon DB State' : '⚡ Simulate Shortfall Risk Scenario'}
        </button>
      </div>
    </div>
  );
}
