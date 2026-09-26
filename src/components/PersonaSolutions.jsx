import React from 'react';
import { GraduationCap, Briefcase, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function PersonaSolutions() {
  return (
    <section className="section-spacing" style={{ backgroundColor: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
          <div className="badge badge-blue" style={{ marginBottom: '16px' }}>
            <GraduationCap size={14} />
            <span>Target User Personas</span>
          </div>
          <h2 className="heading-lg" style={{ marginBottom: '16px' }}>
            Engineered for Students & Young Professionals
          </h2>
          <p className="body-lead">
            Traditional banking apps treat everyone like salaried corporate employees. SPECIFY is tailored specifically to irregular cash-flow realities.
          </p>
        </div>

        {/* 2 Persona Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px'
        }}>
          {/* Persona Card 1: Riya */}
          <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--brand-blue-light)',
                color: 'var(--brand-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 className="heading-sm">Riya</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Final-Year Engineering Student</span>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}>
              <strong>Financial Situation:</strong> Irregular family transfers + occasional freelance UPI credits. Monthly rent & mess fee debits.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', uppercase: 'true', marginBottom: '4px' }}>
                Primary Day-to-Day Question
              </div>
              <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                "Can I afford this weekend trip with my batchmates without missing rent next week?"
              </p>
            </div>

            <div style={{
              backgroundColor: 'var(--safe-green-light)',
              border: '1px solid var(--safe-green-border)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--safe-green)', marginBottom: '4px' }}>
                <ShieldCheck size={16} />
                <span>Guardian Solution</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Simulates trip debit (₹2,000). Alerts Riya: <em>"Trip will cause ₹600 shortfall on mess fee debit date (Oct 24). Recommend deferring trip or capping daily spend to ₹120."</em>
              </p>
            </div>
          </div>

          {/* Persona Card 2: Aman */}
          <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'var(--safe-green-light)',
                color: 'var(--safe-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Briefcase size={24} />
              </div>
              <div>
                <h3 className="heading-sm">Aman</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Early-Career Intern / Junior Dev</span>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}>
              <strong>Financial Situation:</strong> Monthly stipend credit, EMI-like learning subscriptions, variable food delivery & transport spend.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', uppercase: 'true', marginBottom: '4px' }}>
                Primary Day-to-Day Question
              </div>
              <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                "Will my daily Swiggy and transport debits exhaust my account before my stipend drops?"
              </p>
            </div>

            <div style={{
              backgroundColor: 'var(--brand-blue-light)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '4px' }}>
                <ShieldCheck size={16} />
                <span>Guardian Solution</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Tracks cumulative food micro-spends. Dynamically scales down daily Safe-to-Spend pill from ₹500/day to ₹280/day to guarantee subscription debit safety.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
