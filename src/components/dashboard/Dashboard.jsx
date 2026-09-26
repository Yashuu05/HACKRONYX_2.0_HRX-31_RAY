import React from 'react';

export default function Dashboard({ currentUser, onLogout }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f3f4f6', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #1f2937' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>AI Cashflow Guardian Dashboard</h1>
            <p style={{ color: '#9ca3af', marginTop: '4px' }}>Welcome back, {currentUser?.full_name || 'User'} ({currentUser?.email})</p>
          </div>
          <button 
            onClick={onLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Sign Out
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid #1f2937' }}>
            <h3 style={{ color: '#10b981', marginTop: 0 }}>Safe-to-Spend Limit</h3>
            <p style={{ fontSize: '36px', fontWeight: 'bold', margin: '12px 0' }}>₹4,250</p>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Safe until next stipend on Oct 1st after reserves</p>
          </div>

          <div style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid #1f2937' }}>
            <h3 style={{ color: '#3b82f6', marginTop: 0 }}>Upcoming Subscriptions & Bills</h3>
            <p style={{ fontSize: '36px', fontWeight: 'bold', margin: '12px 0' }}>₹1,499</p>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>3 recurring payments scheduled this month</p>
          </div>

          <div style={{ backgroundColor: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid #1f2937' }}>
            <h3 style={{ color: '#f59e0b', marginTop: 0 }}>Liquidity Risk Score</h3>
            <p style={{ fontSize: '36px', fontWeight: 'bold', margin: '12px 0', color: '#10b981' }}>Low (12%)</p>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Buffer remains strong for upcoming unexpected expenses</p>
          </div>
        </div>
      </div>
    </div>
  );
}
