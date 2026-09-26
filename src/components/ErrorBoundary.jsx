import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-canvas, #F8FAFC)',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
              Dashboard View Protection Active
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', marginBottom: '20px' }}>
              An unexpected render issue was automatically isolated to prevent the screen from going blank.
            </p>
            <div style={{
              backgroundColor: '#F1F5F9',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#475569',
              textAlign: 'left',
              overflowX: 'auto',
              marginBottom: '20px',
              maxHeight: '120px'
            }}>
              {String(this.state.error?.message || this.state.error || 'Unknown error')}
            </div>
            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={16} />
              <span>Reload Dashboard</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
