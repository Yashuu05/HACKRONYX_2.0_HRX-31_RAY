import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

export default function SignIn({ onNavigateSignUp, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Incorrect email or password. Please check credentials.');
      }

      // Login success
      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.access_token);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 72px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-canvas)',
      padding: '40px 20px'
    }}>
      <div className="card animate-fade-in" style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border-color)'
      }}>
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'var(--safe-green-light)',
            color: 'var(--safe-green)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 className="heading-md" style={{ marginBottom: '6px' }}>Welcome back</h1>
          <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
            Sign in to access your personal cashflow guardian dashboard.
          </p>
        </div>

        {/* Quick Demo Hint */}
        <div style={{
          backgroundColor: 'var(--brand-blue-light)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '20px',
          fontSize: '12px',
          color: 'var(--brand-blue)'
        }}>
          <strong>Demo Credential:</strong> <code>riya@college.edu.in</code> / <code>Password123!</code>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            color: '#991B1B',
            fontSize: '13px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Address */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                placeholder="riya@college.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  transition: 'border 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--brand-blue)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  transition: 'border 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--brand-blue)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Hyperlink Redirect to Sign Up */}
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
          </span>
          <button
            onClick={onNavigateSignUp}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand-blue)',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
