import React, { useState } from 'react';
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

import { logoutUser } from './firebase';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'signup' | 'signin' | 'dashboard'
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setAuthToken(null);
    setCurrentView('landing');
  };

  const openDashboard = () => {
    if (!currentUser) {
      // Default to demo user if not logged in
      setCurrentUser({
        id: 'usr-001',
        full_name: 'Riya Sharma',
        email: 'riya@college.edu.in'
      });
    }
    setCurrentView('dashboard');
  };

  const scrollToDemo = () => {
    setCurrentView('landing');
    setTimeout(() => {
      const el = document.getElementById('demo-scenario');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (currentView === 'dashboard') {
    return (
      <Dashboard
        currentUser={currentUser || { full_name: 'Riya Sharma', email: 'riya@college.edu.in' }}
        onLogout={handleLogout}
      />
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
      />

      <main style={{ flex: 1 }}>
        {currentView === 'landing' && (
          <>
            <Hero onExploreClick={openDashboard} />
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

      <FooterCta onLaunchDashboard={openDashboard} />
    </div>
  );
}
