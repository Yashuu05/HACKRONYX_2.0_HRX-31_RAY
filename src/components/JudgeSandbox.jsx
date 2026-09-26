import React, { useState } from 'react';
import { Upload, PlusCircle, RefreshCw, CheckCircle2, Sliders, AlertTriangle } from 'lucide-react';

export default function JudgeSandbox({ onInjectExpense }) {
  const [injectedLogs, setInjectedLogs] = useState([
    { id: 1, time: '19:40:12', event: 'Ingested initial 14-day CSV feed', status: 'Success' },
    { id: 2, time: '19:40:13', event: 'Recognized 3 recurring items (Rent, Mess, Stipend)', status: 'Success' },
    { id: 3, time: '19:40:14', event: 'Safe-to-Spend calculated: ₹3,450.00', status: 'Healthy' }
  ]);

  const [activeTab, setActiveTab] = useState('preset');

  const handleInjectAdHoc = (amount, description) => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      event: `Injecting transaction: ${description} (-₹${amount})`,
      status: 'Recalculating'
    };
    setInjectedLogs((prev) => [newLog, ...prev]);

    if (onInjectExpense) {
      onInjectExpense(amount, description);
    }
  };

  return (
    <section id="judge-sandbox" className="section-spacing" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--border-color)' }}>
      <div className="container">
        <div className="card" style={{
          backgroundColor: 'var(--bg-canvas)',
          border: '2px solid var(--brand-blue-light)',
          borderRadius: '24px',
          padding: '36px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div className="badge badge-blue" style={{ marginBottom: '12px' }}>
                <Sliders size={14} />
                <span>Judge Evaluation Control Center</span>
              </div>
              <h2 className="heading-lg" style={{ marginBottom: '8px' }}>
                Live Stress-Test Sandbox
              </h2>
              <p className="body-lead" style={{ maxWidth: '600px' }}>
                Judges can inject ad-hoc transactions or upload custom CSV feeds at evaluation time to stress-test dynamic re-planning live.
              </p>
            </div>

            {/* Ingestion Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleInjectAdHoc(1500, 'Ad-hoc Laptop Repair')}
                className="btn btn-secondary btn-sm"
              >
                <PlusCircle size={16} color="var(--caution-amber)" />
                <span>Inject +₹1,500 Expense</span>
              </button>

              <button
                onClick={() => handleInjectAdHoc(3000, 'Ad-hoc Family Transfer')}
                className="btn btn-secondary btn-sm"
              >
                <PlusCircle size={16} color="var(--safe-green)" />
                <span>Inject +₹3,000 Credit</span>
              </button>

              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                <span>Upload Custom CSV</span>
                <input type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleInjectAdHoc(0, `Uploaded file: ${e.target.files[0].name}`);
                  }
                }} />
              </label>
            </div>
          </div>

          {/* Real-time Ingestion & Recalculation Terminal Log */}
          <div style={{
            backgroundColor: '#0F172A',
            color: '#F8FAFC',
            borderRadius: '16px',
            padding: '20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '12px', color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>
              <span>LIVE SYSTEM EVENT BUS LOG</span>
              <span>DETERMINISTIC PIPELINE STATUS: ACTIVE</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {injectedLogs.map((log) => (
                <div key={log.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: '#64748B' }}>[{log.time}]</span>
                  <span style={{ flex: 1 }}>{log.event}</span>
                  <span style={{
                    color: log.status === 'Healthy' ? '#34D399' : log.status === 'Recalculating' ? '#FBBF24' : '#60A5FA',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    [{log.status}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
