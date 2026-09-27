import React from 'react';
import { Bell } from 'lucide-react';

export default function NotificationBell({ unreadCount = 0, onClick, isOpen = false }) {
  return (
    <button
      onClick={onClick}
      title={unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'Alert Notifications'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        border: isOpen ? '1px solid var(--brand-blue)' : '1px solid var(--border-color)',
        backgroundColor: isOpen ? 'var(--brand-blue-light)' : '#FFFFFF',
        color: isOpen ? 'var(--brand-blue)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isOpen ? 'var(--shadow-sm)' : 'none'
      }}
      aria-label="Toggle notifications"
    >
      <Bell size={18} color={isOpen ? 'var(--brand-blue)' : 'var(--text-secondary)'} />
      {unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            borderRadius: '9px',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)',
            border: '2px solid #FFFFFF',
            animation: 'pulse 2s infinite'
          }}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
