import React, { useState } from 'react';
import { Database, LineChart, FileText, ShieldAlert, RefreshCw, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function IntelligenceLoop() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: '01',
      title: 'Observe',
      subtitle: 'Data Ingestion',
      icon: Database,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      description: 'Ingests transaction histories (CSV/JSON), UPI merchant narrations (Swiggy/Zomato), salary/stipends, and recurring family transfers.'
    },
    {
      step: '02',
      title: 'Predict',
      subtitle: '7–14 Day Forecast',
      icon: LineChart,
      color: '#059669',
      bgColor: '#ECFDF5',
      description: 'Computes forward-looking liquidity forecasts with confidence upper/lower bounds based on historical frequency & upcoming bills.'
    },
    {
      step: '03',
      title: 'Explain',
      subtitle: 'Traceable Attribution',
      icon: FileText,
      color: '#D97706',
      bgColor: '#FFFBEB',
      description: 'Generates plain-language explanations referencing specific transaction triggers. No numeric black-box hallucinations.'
    },
    {
      step: '04',
      title: 'Intervene',
      subtitle: 'Protective Actions',
      icon: ShieldAlert,
      color: '#DC2626',
      bgColor: '#FEF2F2',
      description: 'Detects shortfall risk early and recommends protective recommendations (daily spend cap, deferred discretionary alerts).'
    },
    {
      step: '05',
      title: 'Learn',
      subtitle: 'Continuous Feedback',
      icon: RefreshCw,
      color: '#7C3AED',
      bgColor: '#F5F3FF',
      description: 'Captures user response (Accept / Reject / Modify) and updates internal action ranking weights across multiple cycles.'
    },
    {
      step: '06',
      title: 'Re-plan',
      subtitle: 'Sub-Second Update',
      icon: Zap,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      description: 'Recalculates Safe-to-Spend and updates the live dashboard state in well under 5 seconds for a fluid demo experience.'
    }
  ];

  return (
    <section id="intelligence-loop" className="section-spacing" style={{ backgroundColor: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
          <div className="badge badge-blue" style={{ marginBottom: '16px' }}>
            <Zap size={14} />
            <span>Problem Statement Architecture</span>
          </div>
          <h2 className="heading-lg" style={{ marginBottom: '16px' }}>
            The Continuous Intelligence Loop
          </h2>
          <p className="body-lead">
            Unlike static finance apps, Cashflow Guardian continuously executes the six-stage autonomous cycle to keep your liquidity protected.
          </p>
        </div>

        {/* Horizontal 6-Step Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {steps.map((item, index) => {
            const IconComponent = item.icon;
            const isActive = activeStep === index;

            return (
              <div
                key={index}
                onClick={() => setActiveStep(index)}
                className="card card-interactive"
                style={{
                  padding: '20px 16px',
                  backgroundColor: isActive ? '#FFFFFF' : 'var(--bg-surface)',
                  borderColor: isActive ? item.color : 'var(--border-color)',
                  borderWidth: isActive ? '2px' : '1px',
                  boxShadow: isActive ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: isActive ? item.color : 'var(--text-muted)' }}>
                    {item.step}
                  </span>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: item.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.color
                  }}>
                    <IconComponent size={18} />
                  </div>
                </div>

                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  {item.subtitle}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Step Detail Panel */}
        <div className="card" style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: steps[activeStep].bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: steps[activeStep].color,
            flexShrink: 0
          }}>
            {React.createElement(steps[activeStep].icon, { size: 32 })}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <span className="badge" style={{ backgroundColor: steps[activeStep].bgColor, color: steps[activeStep].color, fontSize: '12px' }}>
                Stage {steps[activeStep].step}
              </span>
              <h3 className="heading-sm">{steps[activeStep].title} — {steps[activeStep].subtitle}</h3>
            </div>
            <p className="body-text">
              {steps[activeStep].description}
            </p>
          </div>
          <button
            onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
            className="btn btn-secondary btn-sm"
          >
            <span>Next Stage</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}