import React, { useState } from 'react';
import { TrendingUp, ShieldCheck, AlertTriangle, ArrowRight, Play, CheckCircle2, Sliders, Calendar, Sparkles } from 'lucide-react';
import { INITIAL_FORECAST_DATA } from '../utils/mockData';

export default function Hero({ onExploreClick }) {
  const [horizonDays, setHorizonDays] = useState(14);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const displayedData = horizonDays === 7 ? INITIAL_FORECAST_DATA.slice(0, 7) : INITIAL_FORECAST_DATA;

  // SVG Chart Dimensions & Math
  const width = 540;
  const height = 180;
  const padding = 24;

  const maxVal = 11000;
  const minVal = 3000;

  const getX = (index) => padding + (index * (width - 2 * padding)) / (displayedData.length - 1);
  const getY = (val) => height - padding - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);

  // Generate SVG Path string for Expected, Best, Worst
  const expectedPoints = displayedData.map((d, i) => `${getX(i)},${getY(d.expected)}`).join(' L ');
  
  // Area path for Confidence Band (Best down to Worst)
  const bestPoints = displayedData.map((d, i) => `${getX(i)},${getY(d.best)}`);
  const worstPoints = [...displayedData].reverse().map((d, i) => {
    const origIndex = displayedData.length - 1 - i;
    return `${getX(origIndex)},${getY(d.worst)}`;
  });
  const confidenceBandPath = `M ${bestPoints.join(' L ')} L ${worstPoints.join(' L ')} Z`;

  return (
    <section className="section-spacing" style={{
      background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
      borderBottom: '1px solid var(--border-color)',
      paddingTop: '60px'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
          alignItems: 'center'
        }}>
          {/* Left Column: Value Proposition */}
          <div>
            <div className="badge badge-blue" style={{ marginBottom: '20px' }}>
              <span className="badge-dot"></span>
              <span>Forward-Looking Personal Liquidity Intelligence</span>
            </div>

            <h1 className="heading-xl" style={{ marginBottom: '20px' }}>
              Know your true <span style={{ color: 'var(--brand-blue)' }}>Safe-to-Spend</span> limit before your next stipend or shock.
            </h1>

            <p className="body-lead" style={{ marginBottom: '32px' }}>
              Traditional finance apps look backward at what you already spent. 
              <strong> SPECIFY</strong> continuously forecasts your next 7 to 14 days, protects essential commitments like rent and mess fees, and alerts you to shortfalls before they happen.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <button onClick={onExploreClick} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                <span>Explore Live Interactive Demo</span>
                <ArrowRight size={18} />
              </button>
              
              <a href="#demo-scenario" className="btn btn-secondary" style={{ padding: '14px 24px', fontSize: '16px' }}>
                <Play size={18} style={{ color: 'var(--brand-blue)' }} />
                <span>Watch 8-Step Demo Arc</span>
              </a>
            </div>

            {/* Trust Metrics Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              paddingTop: '24px',
              borderTop: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--brand-blue)' }}>7–14 Day</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Forecast Horizon</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--safe-green)' }}>100% Deterministic</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Auditable Math</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--caution-amber)' }}>2-Cycle</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Live Feedback Loop</div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Interactive Dashboard Preview Card */}
          <div className="card" style={{
            padding: '24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--safe-green)' }}></span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Student Feed (UPI & Stipend)</span>
              </div>
              <div style={{ display: 'flex', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', padding: '3px' }}>
                <button
                  onClick={() => setHorizonDays(7)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: horizonDays === 7 ? '#FFFFFF' : 'transparent',
                    color: horizonDays === 7 ? 'var(--brand-blue)' : 'var(--text-secondary)',
                    boxShadow: horizonDays === 7 ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setHorizonDays(14)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: horizonDays === 14 ? '#FFFFFF' : 'transparent',
                    color: horizonDays === 14 ? 'var(--brand-blue)' : 'var(--text-secondary)',
                    boxShadow: horizonDays === 14 ? 'var(--shadow-sm)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  14 Days
                </button>
              </div>
            </div>

            {/* Dynamic Safe-to-Spend Main Metric Box */}
            <div style={{
              backgroundColor: 'var(--safe-green-light)',
              border: '1px solid var(--safe-green-border)',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--safe-green)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Dynamic Safe-to-Spend (Today)
                  </span>
                  <div style={{ fontSize: '34px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                    ₹ 3,450.00
                  </div>
                </div>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid var(--safe-green-border)',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--safe-green)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>Buffer Intact</span>
                </div>
              </div>

              {/* Context Breakdown Pills */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px dashed var(--safe-green-border)',
                fontSize: '11px'
              }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Lowest Point</div>
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>₹ 5,200.00</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Protected Bills</div>
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>₹ 1,200.00</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Safety Buffer</div>
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>₹ 550.00</div>
                </div>
              </div>
            </div>

            {/* Forecast Line Chart Visualizer */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {horizonDays}-Day Liquidity & Confidence Band
                </span>
                <span style={{ fontSize: '11px', color: 'var(--brand-blue)', fontWeight: '600' }}>
                  Best / Expected / Worst Case
                </span>
              </div>

              <div style={{ position: 'relative', width: '100%', height: `${height}px`, backgroundColor: '#FAFAFA', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1={getY(8000)} x2={width} y2={getY(8000)} stroke="#E2E8F0" strokeDasharray="3 3" />
                  <line x1="0" y1={getY(5000)} x2={width} y2={getY(5000)} stroke="#E2E8F0" strokeDasharray="3 3" />
                  
                  {/* Safety Buffer Threshold Line */}
                  <line x1="0" y1={getY(4000)} x2={width} y2={getY(4000)} stroke="#FDE68A" strokeWidth="2" strokeDasharray="4 4" />

                  {/* Confidence Band Polygon */}
                  <path d={confidenceBandPath} fill="#EFF6FF" opacity="0.6" />

                  {/* Main Expected Line */}
                  <path d={`M ${expectedPoints}`} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Interactive Data Points */}
                  {displayedData.map((d, i) => (
                    <g key={i}>
                      <circle
                        cx={getX(i)}
                        cy={getY(d.expected)}
                        r={hoveredPoint === i ? 6 : 4}
                        fill={d.type === 'essential' ? '#D97706' : d.type === 'income' ? '#059669' : '#2563EB'}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        onMouseEnter={() => setHoveredPoint(i)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                      />
                    </g>
                  ))}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredPoint !== null && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: `${Math.min(Math.max(getX(hoveredPoint) - 70, 10), width - 150)}px`,
                    backgroundColor: 'var(--text-primary)',
                    color: '#FFFFFF',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    boxShadow: 'var(--shadow-lg)',
                    pointerEvents: 'none',
                    zIndex: 10
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '2px' }}>{displayedData[hoveredPoint].day}</div>
                    <div>{displayedData[hoveredPoint].event}</div>
                    <div style={{ color: '#93C5FD', fontWeight: '600', marginTop: '2px' }}>
                      Exp: ₹{displayedData[hoveredPoint].expected.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Embedded Live Shortfall Prevention Alert Card */}
            <div style={{
              backgroundColor: 'var(--caution-amber-light)',
              border: '1px solid var(--caution-amber-border)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <div style={{
                color: 'var(--caution-amber)',
                backgroundColor: '#FFFFFF',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <AlertTriangle size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Early Shortfall Warning
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--caution-amber)' }}>
                    Trace ID: #TR-8821
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 8px 0' }}>
                  Delayed stipend expected on Oct 25 + Mess Fee may breach buffer by ₹350 on Oct 26.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-sm" style={{
                    backgroundColor: '#FFFFFF',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--caution-amber-border)',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    Defer Discretionary Spend (₹499)
                  </button>
                  <button className="btn btn-sm" style={{
                    backgroundColor: 'var(--brand-blue)',
                    color: '#FFFFFF',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    Apply ₹150/Day Cap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
