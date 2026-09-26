import React from 'react';
import { ShieldCheck, ArrowRight, Github, ExternalLink } from 'lucide-react';

export default function FooterCta({ onLaunchDashboard }) {
  return (
    <footer style={{ backgroundColor: '#0F172A', color: '#F8FAFC', paddingTop: '80px', paddingBottom: '40px' }}>
      <div className="container">
        {/* Main CTA Card Banner */}
        <div style={{
          backgroundColor: '#1E293B',
          borderRadius: '24px',
          padding: '48px',
          textAlign: 'center',
          border: '1px solid #334155',
          marginBottom: '64px',
          boxShadow: 'var(--shadow-xl)'
        }}>
          <div className="badge badge-green" style={{ marginBottom: '16px' }}>
            <ShieldCheck size={14} />
            <span>Hackronyx 2.0 Final Round Ready</span>
          </div>

          <h2 className="heading-lg" style={{ color: '#FFFFFF', marginBottom: '16px' }}>
            Ready to experience explainable personal cash-flow intelligence?
          </h2>

          <p className="body-lead" style={{ color: '#94A3B8', maxWidth: '600px', margin: '0 auto 32px auto' }}>
            Explore the live dynamic Safe-to-Spend calculator, run the 8-step demo scenario, or upload your own CSV test feeds.
          </p>

          <button onClick={onLaunchDashboard} className="btn btn-emerald" style={{ padding: '16px 32px', fontSize: '16px' }}>
            <span>Launch AI Cashflow Guardian</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Footer Nav & Attribution */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          paddingTop: '32px',
          borderTop: '1px solid #334155',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Left Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', color: '#FFFFFF' }}>AI Cashflow Guardian</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Hackronyx 2.0 — Problem Statement R2-P4</div>
            </div>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: '#94A3B8', fontWeight: '500' }}>
            <a href="#safe-to-spend" style={{ color: 'inherit', textDecoration: 'none' }}>Safe-to-Spend</a>
            <a href="#intelligence-loop" style={{ color: 'inherit', textDecoration: 'none' }}>Intelligence Loop</a>
            <a href="#demo-scenario" style={{ color: 'inherit', textDecoration: 'none' }}>8-Step Scenario</a>
            <a href="#judge-sandbox" style={{ color: 'inherit', textDecoration: 'none' }}>Judge Sandbox</a>
          </div>

          {/* Copyright */}
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Built for 24-Hour Hackathon Evaluation. Simulated Account Feeds.
          </div>
        </div>
      </div>
    </footer>
  );
}
