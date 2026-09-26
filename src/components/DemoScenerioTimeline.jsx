import React, { useState } from 'react';
import { Play, ChevronRight, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react';
import { DEMO_SCENARIO_STEPS } from '../utils/mockData';

export default function DemoScenarioTimeline() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const activeStep = DEMO_SCENARIO_STEPS[currentStepIndex];

  return (
    <section id="demo-scenario" className="section-spacing" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--border-color)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
          <div className="badge badge-amber" style={{ marginBottom: '16px' }}>
            <Play size={14} />
            <span>Mandated Live-Demo Scenario Arc</span>
          </div>
          <h2 className="heading-lg" style={{ marginBottom: '16px' }}>
            8-Step Interactive Narrative Preview
          </h2>
          <p className="body-lead">
            The organizer requires this exact narrative arc to be demonstrable live. Click through each step below to witness how Cashflow Guardian dynamically re-plans state changes.
          </p>
        </div>

        {/* Stepper Navigation Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '16px',
          marginBottom: '32px'
        }}>
          {DEMO_SCENARIO_STEPS.map((step, idx) => {
            const isSelected = idx === currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'var(--brand-blue-light)' : '#FFFFFF',
                  color: isSelected ? 'var(--brand-blue)' : 'var(--text-secondary)',
                  fontWeight: '700',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                }}
              >
                {step.title}
              </button>
            );
          })}
        </div>

        {/* Active Scenario Card Showcase */}
        <div className="card" style={{
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          padding: '36px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '36px',
          alignItems: 'center'
        }}>
          {/* Left Column: Step Narrative */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span className={`badge badge-${activeStep.badgeColor}`}>
                {activeStep.badge}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                Step {activeStep.id} of 8
              </span>
            </div>

            <h3 className="heading-md" style={{ marginBottom: '16px' }}>
              {activeStep.title.split('. ')[1]}
            </h3>

            <p className="body-lead" style={{ marginBottom: '24px' }}>
              {activeStep.description}
            </p>

            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '6px', textTransform: 'uppercase' }}>
                System Causal Explanation (Traceability)
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
                "{activeStep.explanation}"
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                className="btn btn-secondary btn-sm"
                style={{ opacity: currentStepIndex === 0 ? 0.5 : 1 }}
              >
                Previous Step
              </button>
              
              <button
                disabled={currentStepIndex === DEMO_SCENARIO_STEPS.length - 1}
                onClick={() => setCurrentStepIndex((prev) => Math.min(DEMO_SCENARIO_STEPS.length - 1, prev + 1))}
                className="btn btn-primary btn-sm"
                style={{ opacity: currentStepIndex === DEMO_SCENARIO_STEPS.length - 1 ? 0.5 : 1 }}
              >
                <span>Advance to Step {Math.min(8, currentStepIndex + 2)}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Right Column: Live System State Box */}
          <div className="card" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Live Dashboard State
              </span>
              <span className={`badge badge-${activeStep.riskColor}`}>
                {activeStep.riskLevel}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Re-computed Safe-to-Spend
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '800',
                color: activeStep.riskColor === 'amber' ? 'var(--caution-amber)' : 'var(--safe-green)',
                marginTop: '2px'
              }}>
                {activeStep.stsValue}
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Recommended Protective Action
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {activeStep.actionSuggested}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
