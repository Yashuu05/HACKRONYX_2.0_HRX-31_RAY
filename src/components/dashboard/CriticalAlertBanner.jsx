import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, ArrowRight } from 'lucide-react';

export default function CriticalAlertBanner({ alert, onAcknowledge, onOpenNotificationCenter }) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!alert || isDismissed) return null;

  const isCritical = alert.alert_level === 'critical';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderRadius: '12px',
        backgroundColor: isCritical ? '#FEF2F2' : '#FFFBEB',
        border: `1px solid ${isCritical ? '#FCA5A5' : '#FDE68A'}`,
        color: isCritical ? '#991B1B' : '#92400E',
        marginBottom: '4px',
        boxShadow: isCritical ? '0 4px 12px rgba(220, 38, 38, 0.08)' : '0 4px 12px rgba(217, 119, 6, 0.08)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <div style={{
          padding: '6px',
          borderRadius: '8px',
          backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7',
          color: isCritical ? '#DC2626' : '#D97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isCritical ? <ShieldAlert size={18} /> : <AlertTriangle size={18} />}
        </div>
        <div style={{ fontSize: '13px', fontWeight: '600', lineHeight: '1.4' }}>
          <span style={{ fontWeight: '800', marginRight: '6px' }}>
            {isCritical ? 'CRITICAL ALERT:' : 'ATTENTION REQUIRED:'}
          </span>
          {alert.message}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '16px' }}>
        {onOpenNotificationCenter && (
          <button
            onClick={onOpenNotificationCenter}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: isCritical ? '#DC2626' : '#D97706',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>View Details</span>
            <ArrowRight size={13} />
          </button>
        )}

        <button
          onClick={() => {
            setIsDismissed(true);
            if (onAcknowledge) onAcknowledge(alert.alert_id);
          }}
          title="Dismiss banner"
          style={{
            background: 'transparent',
            border: 'none',
            color: isCritical ? '#991B1B' : '#92400E',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
