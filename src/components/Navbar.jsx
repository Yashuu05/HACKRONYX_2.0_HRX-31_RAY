import React from 'react';
import { ShieldCheck, LogIn, UserPlus, LogOut, User } from 'lucide-react';

export default function Navbar({ onNavigateHome, onNavigateSignIn, onNavigateSignUp, currentUser, onLogout, currentView }) {
  const scrollToSection = (id) => {
    if (currentView !== 'landing') {
      if (onNavigateHome) onNavigateHome();
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px'
      }}>
        {/* Brand Logo */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
          onClick={onNavigateHome}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'var(--brand-blue-light)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-blue)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <ShieldCheck size={22} strokeWidth={2.4} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              Cashflow Guardian
            </span>
            <span className="badge badge-blue" style={{ padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
              R2-P4
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <button onClick={() => scrollToSection('safe-to-spend')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'color 0.15s ease' }}>
            Safe-to-Spend
          </button>
          <button onClick={() => scrollToSection('intelligence-loop')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'color 0.15s ease' }}>
            Intelligence Loop
          </button>
          <button onClick={() => scrollToSection('demo-scenario')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'color 0.15s ease' }}>
            8-Step Demo Arc
          </button>
          <button onClick={() => scrollToSection('learning-loop')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'color 0.15s ease' }}>
            Explainability
          </button>
          <button onClick={() => scrollToSection('judge-sandbox')} style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
            For Judges
          </button>
        </nav>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                <User size={16} color="var(--brand-blue)" />
                <span>{currentUser.full_name || currentUser.email}</span>
              </div>
              <button onClick={onLogout} className="btn btn-secondary btn-sm" style={{ padding: '6px 14px', fontSize: '12px' }}>
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <>
              <button onClick={onNavigateSignIn} className="btn btn-secondary btn-sm" style={{ padding: '8px 16px', fontWeight: '600' }}>
                <LogIn size={15} />
                <span>Sign In</span>
              </button>

              <button onClick={onNavigateSignUp} className="btn btn-primary btn-sm" style={{ padding: '8px 18px', fontWeight: '600' }}>
                <UserPlus size={15} />
                <span>Sign Up</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
