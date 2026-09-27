import React, { useState } from 'react';
import { 
  X, Check, CheckCheck, Trash2, ShieldAlert, AlertTriangle, 
  Bell, Info, Sparkles, Filter 
} from 'lucide-react';

export default function NotificationCenter({
  isOpen,
  onClose,
  alerts = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onDeleteAlert,
  onNavigateToChat
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'critical'

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'unread') return !a.is_read;
    if (filter === 'critical') return a.alert_level === 'critical';
    return true;
  });

  const getSeverityBadge = (level) => {
    switch (level) {
      case 'critical':
        return {
          label: 'CRITICAL',
          bg: '#FEF2F2',
          color: '#DC2626',
          border: '#FCA5A5',
          icon: <ShieldAlert size={14} color="#DC2626" />
        };
      case 'high':
        return {
          label: 'HIGH RISK',
          bg: '#FFFBEB',
          color: '#D97706',
          border: '#FDE68A',
          icon: <AlertTriangle size={14} color="#D97706" />
        };
      case 'mid':
        return {
          label: 'BUDGET ALERT',
          bg: '#EFF6FF',
          color: '#2563EB',
          border: '#BFDBFE',
          icon: <Bell size={14} color="#2563EB" />
        };
      case 'low':
      default:
        return {
          label: 'NOTICE',
          bg: '#F8FAFC',
          color: '#64748B',
          border: '#E2E8F0',
          icon: <Info size={14} color="#64748B" />
        };
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.25)',
          backdropFilter: 'blur(2px)',
          zIndex: 100,
          transition: 'all 0.2s ease'
        }}
      />

      {/* Floating Flyout Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          bottom: '16px',
          width: '420px',
          maxWidth: 'calc(100vw - 32px)',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 101,
          overflow: 'hidden',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F8FAFC'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Alert Notifications
              </h3>
              {unreadCount > 0 && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  fontSize: '11px',
                  fontWeight: '800'
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real-time condition triggers from Neon DB
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && onMarkAllRead && (
              <button
                onClick={onMarkAllRead}
                title="Mark all as read"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--brand-blue)',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <CheckCheck size={13} />
                <span>Mark All Read</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: '#FFFFFF'
        }}>
          {[
            { id: 'all', label: `All (${alerts.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'critical', label: 'Critical' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: filter === tab.id ? '1px solid var(--brand-blue)' : '1px solid var(--border-color)',
                backgroundColor: filter === tab.id ? 'var(--brand-blue-light)' : '#FFFFFF',
                color: filter === tab.id ? 'var(--brand-blue)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: filter === tab.id ? '700' : '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alert Items List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#FAFAFA'
        }}>
          {filteredAlerts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)'
            }}>
              <Bell size={36} style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.3 }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                All clear! No alerts
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {filter === 'unread'
                  ? 'You have caught up with all notifications.'
                  : 'Your budget and safety buffer thresholds are currently safe.'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const badge = getSeverityBadge(alert.alert_level);
              return (
                <div
                  key={alert.alert_id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '14px',
                    padding: '16px',
                    border: `1px solid ${alert.is_read ? 'var(--border-color)' : badge.border}`,
                    borderLeft: `4px solid ${badge.color}`,
                    boxShadow: alert.is_read ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Top row: badge + time + mark read */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '800',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatTimestamp(alert.created_at)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {!alert.is_read && onMarkRead && (
                        <button
                          onClick={() => onMarkRead(alert.alert_id)}
                          title="Mark as read"
                          style={{
                            padding: '4px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: '#FFFFFF',
                            color: 'var(--safe-green)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Check size={13} />
                        </button>
                      )}
                      {onDeleteAlert && (
                        <button
                          onClick={() => onDeleteAlert(alert.alert_id)}
                          title="Dismiss alert"
                          style={{
                            padding: '4px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alert Message */}
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    lineHeight: '1.45',
                    margin: '0 0 10px 0',
                    fontWeight: alert.is_read ? '500' : '600'
                  }}>
                    {alert.message}
                  </p>

                  {/* Action Shortcuts */}
                  {onNavigateToChat && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToChat(`I received an alert: "${alert.message}". What actions should I take?`);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--brand-blue)',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <Sparkles size={11} />
                        <span>Ask AI Guardian to Resolve →</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
