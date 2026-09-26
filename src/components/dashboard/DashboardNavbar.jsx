import React from 'react';
import { ShieldCheck, LayoutDashboard, PieChart, Receipt, Bot, Settings, PlusCircle, Bell, LogOut } from 'lucide-react';

export default function DashboardNavbar({ activeTab, setActiveTab, onOpenAddModal, currentUser, onLogout }) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'transactions', label: 'Transactions & Statements', icon: Receipt },
    { id: 'ai-chat', label: 'AI Guardian', icon: Bot },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '76px',
        padding: '0 24px'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: 'var(--brand-blue-light)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-blue)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <ShieldCheck size={24} strokeWidth={2.4} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              Cashflow Guardian
            </span>
            <span className="badge badge-blue" style={{ padding: '3px 10px', fontSize: '11px', fontWeight: '700' }}>
              Dashboard
            </span>
          </div>
        </div>

        {/* Center Navigation Tabs - Widened & Appropriately Spaced */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--brand-blue-light)' : 'transparent',
                  color: isActive ? 'var(--brand-blue)' : 'var(--text-secondary)',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none'
                }}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Add Transaction Button */}
          <button onClick={onOpenAddModal} className="btn btn-primary btn-sm" style={{ padding: '9px 18px', fontWeight: '700', borderRadius: '12px' }}>
            <PlusCircle size={17} />
            <span>Add Transaction</span>
          </button>

          {/* Settings Icon SVG Button */}
          <button
            onClick={() => setActiveTab('settings')}
            title="Settings"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: activeTab === 'settings' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)',
              backgroundColor: activeTab === 'settings' ? 'var(--brand-blue-light)' : '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeTab === 'settings' ? 'var(--brand-blue)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Settings size={20} />
          </button>

          {/* Notification Alert Bell */}
          <button style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            position: 'relative',
            cursor: 'pointer'
          }}>
            <Bell size={20} />
            <span style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--caution-amber)'
            }}></span>
          </button>

          {/* User Profile / Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '10px', borderLeft: '1px solid var(--border-color)' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-blue-light)',
              border: '1px solid var(--brand-blue-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-blue)',
              fontWeight: '800',
              fontSize: '14px'
            }}>
              {currentUser?.full_name ? currentUser.full_name.charAt(0) : 'R'}
            </div>
            <button onClick={onLogout} title="Sign Out" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
