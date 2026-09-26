import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SafeToSpendVisualizer from './components/SafeToSpendVisualizer';
import IntelligenceLoop from './components/IntelligenceLoop';
import DemoScenarioTimeline from './components/DemoScenerioTimeline';
import PersonaSolutions from './components/PersonaSolutions';
import LearningLoopProof from './components/LearningLoopProof';
import GuardrailsAndSecurity from './components/GuardrailsAndSecurity';
import JudgeSandbox from './components/JudgeSandbox';
import FaqAccordion from './components/FaqAccordion';
import FooterCta from './components/FooterCta';
import SignUp from './components/Signup';
import SignIn from './components/SignIn';
import Dashboard from './components/dashboard/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

import { logoutUser, onAuthStateChange } from './firebase';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cashflow_guardian_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem('cashflow_guardian_token') || null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState(() => {
    try {
      const saved = localStorage.getItem('cashflow_guardian_user');
      return saved ? 'dashboard' : 'landing';
    } catch {
      return 'landing';
    }
  });

  const [dashboardInitialTab, setDashboardInitialTab] = useState('overview');

  // Keep Firebase Auth in sync with application state
  useEffect(() => {
    const unsubscribe = onAuthStateChange((fbUser) => {
      if (fbUser) {
        const activeUid = fbUser.user_id || fbUser.id;
        setCurrentUser((prev) => {
          const updated = {
            ...(prev || {}),
            ...fbUser,
            id: activeUid,
            user_id: activeUid
          };
          try {
            localStorage.setItem('cashflow_guardian_user', JSON.stringify(updated));
          } catch (e) {
            console.warn('LocalStorage sync warning:', e);
          }
          return updated;
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (user, token) => {
    const activeUid = user.user_id || user.id || user.uid;
    const synchronizedUser = {
      ...user,
      id: activeUid,
      user_id: activeUid,
      full_name: user.full_name || user.name || user.email?.split('@')[0] || 'User'
    };
    setCurrentUser(synchronizedUser);
    setAuthToken(token);
    try {
      localStorage.setItem('cashflow_guardian_user', JSON.stringify(synchronizedUser));
      if (token) localStorage.setItem('cashflow_guardian_token', token);
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setAuthToken(null);
    try {
      localStorage.removeItem('cashflow_guardian_user');
      localStorage.removeItem('cashflow_guardian_token');
    } catch (err) {
      console.warn('LocalStorage clear error:', err);
    }
    setCurrentView('landing');
  };

  const openDashboard = (tab = 'overview') => {
    if (!currentUser) {
      const defaultUser = {
        id: 'usr-001',
        user_id: 'usr-001',
        full_name: 'Riya Sharma',
        email: 'riya@college.edu.in'
      };
      setCurrentUser(defaultUser);
      try {
        localStorage.setItem('cashflow_guardian_user', JSON.stringify(defaultUser));
      } catch (err) {}
    }
    setDashboardInitialTab(tab);
    setCurrentView('dashboard');
  };

  const scrollToDemo = () => {
    setCurrentView('landing');
    setTimeout(() => {
      const el = document.getElementById('demo-scenario');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (currentView === 'dashboard') {
    return (
      <ErrorBoundary>
        <Dashboard
          currentUser={currentUser || { id: 'usr-001', user_id: 'usr-001', full_name: 'Riya Sharma', email: 'riya@college.edu.in' }}
          onLogout={handleLogout}
          initialTab={dashboardInitialTab}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentView={currentView}
        onNavigateHome={() => setCurrentView('landing')}
        onNavigateSignIn={() => setCurrentView('signin')}
        onNavigateSignUp={() => setCurrentView('signup')}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateMatrix={() => openDashboard('matrix')}
      />

      <main style={{ flex: 1 }}>
        {currentView === 'landing' && (
          <>
            <Hero onExploreClick={() => openDashboard('overview')} />
            <SafeToSpendVisualizer />
            <IntelligenceLoop />
            <DemoScenarioTimeline />
            <PersonaSolutions />
            <LearningLoopProof />
            <GuardrailsAndSecurity />
            <JudgeSandbox />
            <FaqAccordion />
          </>
        )}

        {currentView === 'signup' && (
          <SignUp
            onNavigateSignIn={() => setCurrentView('signin')}
            onSignUpSuccess={handleAuthSuccess}
          />
        )}

        {currentView === 'signin' && (
          <SignIn
            onNavigateSignUp={() => setCurrentView('signup')}
            onLoginSuccess={handleAuthSuccess}
          />
        )}
      </main>

      <FooterCta onLaunchDashboard={() => openDashboard('overview')} />
    </div>
  );
}
