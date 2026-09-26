import React, { useState } from 'react';
import { ShieldCheck, User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { loginWithGoogle, signupWithEmail, saveUserCredentialsToFirebase } from '../firebase';

export default function SignUp({ onNavigateSignIn, onSignUpSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Password strength logic
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: '#E2E8F0', width: '0%' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: '#EF4444', width: '33%' };
    if (score <= 4) return { score: 2, label: 'Medium', color: '#F59E0B', width: '66%' };
    return { score: 3, label: 'Strong', color: '#10B981', width: '100%' };
  };

  const strength = getPasswordStrength(password);

  // Google Sign-Up / Sign-In Handler
  const handleGoogleSignUp = async () => {
    setErrorMessage('');
    setIsGoogleLoading(true);

    try {
      const { user: firebaseUser } = await loginWithGoogle();

      // Sync Google User with Backend
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
        console.warn('Backend sync skipped or offline, proceeding with Firebase user session:', backendErr);
      }

      const activeUser = {
        ...(backendUser || {}),
        id: firebaseUser.id,
        user_id: firebaseUser.id,
        full_name: (backendUser && (backendUser.full_name || backendUser.name)) || firebaseUser.full_name || 'Google User',
        email: firebaseUser.email,
        photo_url: firebaseUser.photo_url
      };

      if (onSignUpSuccess) {
        onSignUpSuccess(activeUser, token);
      }
    } catch (err) {
      console.error('Google Sign-Up Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      } else if (err.code === 'auth/cancelled-popup-request') {
        return;
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage('This domain is not authorized in Firebase Console. Please add localhost to Firebase authorized domains.');
      } else {
        setErrorMessage(err.message || 'Unable to sign up with Google. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Email/Password Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    let createdUser = null;
    let userToken = null;

    // 1. Try Firebase Authentication Sign Up first
    try {
      const { user: fbUser } = await signupWithEmail(cleanName, cleanEmail, password);
      createdUser = fbUser;
      userToken = `fb-token-${fbUser.id}`;
    } catch (fbErr) {
      console.warn('Firebase Sign Up note:', fbErr.code, fbErr.message);
      if (fbErr.code === 'auth/email-already-in-use') {
        setIsLoading(false);
        setErrorMessage('An account with this email address already exists. Please sign in instead.');
        return;
      } else if (fbErr.code === 'auth/invalid-email') {
        setIsLoading(false);
        setErrorMessage('Please enter a valid email address.');
        return;
      } else if (fbErr.code === 'auth/weak-password') {
        setIsLoading(false);
        setErrorMessage('Password is too weak. Please use at least 6 characters with mixed letters and numbers.');
        return;
      }
      // If other Firebase error (e.g. offline/network), fall through to backend
    }

    // 2. Sync or Register with FastAPI Backend
    try {
      const response = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: cleanName,
          email: cleanEmail,
          password: password,
          firebase_uid: createdUser ? createdUser.id : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        createdUser = {
          ...(createdUser || {}),
          ...data.user,
          id: (createdUser && createdUser.id) || data.user.user_id || data.user.id,
          user_id: (createdUser && createdUser.id) || data.user.user_id || data.user.id
        };
        userToken = data.access_token || userToken;
        saveUserCredentialsToFirebase(createdUser);
      } else if (!createdUser) {
        throw new Error(data.detail || 'Sign up failed. Please try again.');
      }
    } catch (backendErr) {
      console.warn('Backend signup error or already handled:', backendErr);
      if (!createdUser) {
        setIsLoading(false);
        setErrorMessage(backendErr.message || 'Failed to create account. Please try again.');
        return;
      }
    }

    setIsLoading(false);

    if (createdUser && onSignUpSuccess) {
      const activeUser = {
        ...createdUser,
        id: createdUser.user_id || createdUser.id,
        user_id: createdUser.user_id || createdUser.id,
        full_name: createdUser.full_name || cleanName,
        email: createdUser.email || cleanEmail
      };
      onSignUpSuccess(activeUser, userToken);
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
        maxWidth: '460px',
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
            backgroundColor: 'var(--brand-blue-light)',
            color: 'var(--brand-blue)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <img src="/Logo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          </div>
          <h1 className="heading-md" style={{ marginBottom: '6px' }}>Create your Account</h1>
          <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
            Start forecasting your Safe-to-Spend limit with SPECIFY.
          </p>
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
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
              <span>Sign up with Google</span>
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
          {/* Enhanced Full Name */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
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

          {/* Enhanced Email Address */}
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

          {/* Enhanced Password Field */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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

            {/* Enhanced Password Strength Meter */}
            {password && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Password Strength:</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: strength.color }}>{strength.label}</span>
                </div>
                <div style={{ width: '100%', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: strength.width, height: '100%', backgroundColor: strength.color, transition: 'all 0.25s ease' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '10px', fontSize: '15px' }}
          >
            {isLoading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={18} className="animate-spin" />
                Creating Account...
              </span>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Hyperlink Redirect to Sign In */}
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
          </span>
          <button
            onClick={onNavigateSignIn}
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
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
