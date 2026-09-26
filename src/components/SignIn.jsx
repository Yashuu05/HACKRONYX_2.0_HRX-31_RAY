import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { loginWithGoogle, loginWithEmail, saveUserCredentialsToFirebase } from '../firebase';

export default function SignIn({ onNavigateSignUp, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsGoogleLoading(true);

    try {
      const { user: firebaseUser } = await loginWithGoogle();

      // Attempt to sync Google User with Backend
      let backendUser = null;
      let token = `firebase-token-${firebaseUser.id}`;

      try {
        const response = await fetch('http://localhost:8000/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: firebaseUser.email,
            full_name: firebaseUser.full_name || 'Google User',
            firebase_uid: firebaseUser.id,
            photo_url: firebaseUser.photo_url || ''
          })
        });

        if (response.ok) {
          const data = await response.json();
          backendUser = data.user;
          token = data.access_token || token;
        }
      } catch (backendErr) {
        console.warn('Backend sync skipped or offline, proceeding with Firebase session:', backendErr);
      }

      const activeUser = backendUser || {
        id: firebaseUser.id,
        user_id: firebaseUser.id,
        full_name: firebaseUser.full_name,
        email: firebaseUser.email,
        photo_url: firebaseUser.photo_url
      };

      if (onLoginSuccess) {
        onLoginSuccess(activeUser, token);
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup, no error alert needed
        return;
      } else if (err.code === 'auth/cancelled-popup-request') {
        return;
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage('This domain is not authorized in Firebase Console. Please add localhost to Firebase authorized domains.');
      } else {
        setErrorMessage(err.message || 'Unable to sign in with Google. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Email/Password Submit Handler (Supports both Firebase Auth and pre-configured Demo Logins)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const cleanEmail = email.trim();
    let authenticatedUser = null;
    let userToken = null;

    // 1. First, check backend authentication (allows all demo logins and backend users)
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: password
        })
      });

      if (response.ok) {
        const data = await response.json();
        authenticatedUser = data.user;
        userToken = data.access_token;
        // Also sync credentials to Firebase Firestore
        saveUserCredentialsToFirebase(authenticatedUser);
      }
    } catch (backendErr) {
      console.warn('Backend login check failed or unavailable:', backendErr);
    }

    // 2. If not found in backend mock, try Firebase Authentication
    if (!authenticatedUser) {
      try {
        const { user: fbUser } = await loginWithEmail(cleanEmail, password);
        authenticatedUser = fbUser;
        userToken = `fb-token-${fbUser.id}`;
      } catch (fbErr) {
        console.warn('Firebase login attempt:', fbErr.message);
      }
    }

    if (authenticatedUser) {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(authenticatedUser, userToken);
      }
      return;
    }

    // If neither authenticated, provide clear user guidance
    setIsLoading(false);
    setErrorMessage('Incorrect email address or password. Please verify your credentials or sign in with Google.');
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
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: '#FFFFFF',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isGoogleLoading ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
            e.currentTarget.style.borderColor = 'var(--border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          {isGoogleLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" style={{ color: 'var(--brand-blue)' }} />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '22px 0'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            or with email
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
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
            fontSize: '13px',
            lineHeight: 1.4
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
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--brand-blue)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.boxShadow = 'none';
                }}
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--brand-blue)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.boxShadow = 'none';
                }}
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
            disabled={isLoading || isGoogleLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
          >
            {isLoading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={18} className="animate-spin" />
                Signing in...
              </span>
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
