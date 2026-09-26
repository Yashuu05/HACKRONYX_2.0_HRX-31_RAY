import React, { useState } from 'react';
import {
  ShieldCheck, LayoutDashboard, PieChart, Receipt, Bot,
  Settings, PlusCircle, LogOut, Calculator, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function DashboardSidebar({ activeTab, setActiveTab, onOpenAddModal, currentUser, onLogout, onCollapseChange }) {
  const [collapsed, setCollapsed] = useState(false);

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (onCollapseChange) onCollapseChange(next);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'ai-chat', label: 'AI Guardian', icon: Bot },
    { id: 'matrix', label: 'Matrix Explanation', icon: Calculator },
  ];

  const sidebarWidth = collapsed ? '72px' : '240px';

  return (
    <aside style={{
      width: sidebarWidth,
      minHeight: '100vh',
      backgroundColor: '#0F172A',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 200,
      transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
    }}>
      {/* Brand */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: '10px',
        minHeight: '72px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
          }}>
            <ShieldCheck size={20} color="#FFFFFF" strokeWidth={2.4} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                Cashflow Guardian
              </div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Dashboard
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleToggleCollapse}
          style={{
            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#64748B', transition: 'all 0.15s',
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Add Transaction Button */}
      <div style={{ padding: collapsed ? '12px 10px' : '12px 16px' }}>
        <button
          onClick={onOpenAddModal}
          style={{
            width: '100%', padding: collapsed ? '10px' : '10px 14px',
            borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            color: '#FFFFFF', fontWeight: '700', fontSize: '13px',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px', transition: 'all 0.15s',
            boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
            fontFamily: 'inherit',
          }}
        >
          <PlusCircle size={16} />
          {!collapsed && <span>Add Transaction</span>}
        </button>
      </div>

      {/* Nav Section */}
      {!collapsed && (
        <div style={{ padding: '8px 16px 4px', fontSize: '10px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Navigation
        </div>
      )}

      <nav style={{ flex: 1, padding: collapsed ? '4px 8px' : '4px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={collapsed ? tab.label : undefined}
              style={{
                width: '100%',
                padding: collapsed ? '11px' : '11px 14px',
                borderRadius: '10px',
                border: isActive ? '1px solid rgba(37,99,235,0.4)' : '1px solid transparent',
                backgroundColor: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                color: isActive ? '#60A5FA' : '#64748B',
                fontWeight: isActive ? '700' : '500',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '10px',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                position: 'relative',
                fontFamily: 'inherit',
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: '3px', borderRadius: '0 3px 3px 0',
                  backgroundColor: '#2563EB',
                }} />
              )}
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Settings + User */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: collapsed ? '12px 8px' : '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          title={collapsed ? 'Settings' : undefined}
          style={{
            width: '100%',
            padding: collapsed ? '11px' : '11px 14px',
            borderRadius: '10px',
            border: activeTab === 'settings' ? '1px solid rgba(37,99,235,0.4)' : '1px solid transparent',
            backgroundColor: activeTab === 'settings' ? 'rgba(37,99,235,0.15)' : 'transparent',
            color: activeTab === 'settings' ? '#60A5FA' : '#64748B',
            fontWeight: activeTab === 'settings' ? '700' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '10px',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
          }}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: '10px', padding: collapsed ? '8px' : '10px 14px',
          marginTop: '4px',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontWeight: '800', fontSize: '13px',
          }}>
            {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'R'}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#CBD5E1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.full_name || 'User'}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.email || ''}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748B', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

