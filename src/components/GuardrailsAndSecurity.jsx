import React from 'react';
import { ShieldCheck, Lock, AlertCircle, FileCheck, CheckCircle2 } from 'lucide-react';

export default function GuardrailsAndSecurity() {
  const items = [
    {
      icon: ShieldCheck,
      title: 'Deterministic Engine',
      color: '#2563EB',
      bgColor: '#EFF6FF',
      description: 'Numeric forecasts and Safe-to-Spend calculations are 100% deterministic. LLMs are used exclusively for natural-language explainability summaries, preventing numeric hallucinations.'
    },
    {
      icon: Lock,
      title: 'Simulated Feed Privacy',
      color: '#059669',
      bgColor: '#ECFDF5',
      description: 'Operates entirely on simulated account feeds and local CSV/JSON file uploads. No bank logins, OAuth tokens, or credential sharing required during judging.'
    },
    {
      icon: AlertCircle,
      title: 'Zero Lending or Advisory',
      color: '#D97706',
      bgColor: '#FFFBEB',
      description: 'Strictly bounded to liquidity protection. SPECIFY is not a banking, lending, investment, or credit-scoring platform. No real funds ever move.'
    }
  ];

  return (
    <section className="section-spacing" style={{ backgroundColor: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
          <div className="badge badge-blue" style={{ marginBottom: '16px' }}>
            <FileCheck size={14} />
            <span>Product Guardrails</span>
          </div>
          <h2 className="heading-lg" style={{ marginBottom: '16px' }}>
            Built for Transparency & Evaluation Safety
          </h2>
          <p className="body-lead">
            We adhere strictly to hackathon boundaries to ensure every calculation is verifiable, explainable, and repeatable.
          </p>
        </div>

        {/* 3-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px'
        }}>
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="card" style={{ backgroundColor: '#FFFFFF', padding: '28px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: item.bgColor,
                  color: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <Icon size={22} />
                </div>
                <h3 className="heading-sm" style={{ marginBottom: '8px' }}>
                  {item.title}
                </h3>
                <p className="body-sm">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
