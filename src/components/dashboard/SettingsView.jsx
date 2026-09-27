import React, { useState, useEffect } from 'react';
import { User, MessageSquareQuote, Trash2, Sun, Moon, Save, CheckCircle2, AlertTriangle, ShieldAlert, Sliders, Database, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';
import PersonaWizardModal from '../persona/PersonaWizardModal';

export default function SettingsView({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'constants' | 'persona' | 'feedback' | 'account' | 'theme'
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'

  // Persona State (user_persona in Neon DB)
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [personaData, setPersonaData] = useState(null);
  const [personaLoading, setPersonaLoading] = useState(false);

  // Personal Information State (users table)
  const [name, setName] = useState(currentUser?.full_name || 'Riya Sharma');
  const [email, setEmail] = useState(currentUser?.email || 'riya@college.edu.in');
  const [mobileNumber, setMobileNumber] = useState('9876543210');
  const [profession, setProfession] = useState('College Student');
  const [birthdate, setBirthdate] = useState('2004-05-15');

  // Constants State (constants table in Neon DB)
  const [budgetWeek, setBudgetWeek] = useState(5000);
  const [budgetMonth, setBudgetMonth] = useState(10000);
  const [safetyBuffer, setSafetyBuffer] = useState(3000);

  // AI Feedback State (ai_feedback table)
  const [feedbackAction, setFeedbackAction] = useState('accepted'); // 'accepted' | 'rejected' | 'modified'
  const [userComment, setUserComment] = useState('');
  const [feedbackList, setFeedbackList] = useState([]);

  // Status Alerts
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const userId = currentUser?.user_id || currentUser?.id || currentUser?.uid || 'usr-001';

  const fetchFeedbackList = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/feedback/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setFeedbackList(data.feedbacks || []);
        }
      }
    } catch (err) {
      console.warn("Could not fetch feedback history from Neon DB:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/profile/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.name) setName(data.name);
        if (data.profession) setProfession(data.profession);
        if (data.mobile_number) setMobileNumber(data.mobile_number);
        if (data.birthdate) setBirthdate(data.birthdate);
      }
    } catch (err) {
      console.warn("Could not fetch profile from PostgreSQL, using local defaults:", err);
    }
  };

  const fetchConstants = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/constants/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.budget_week !== undefined) setBudgetWeek(data.budget_week);
        if (data.budget_month !== undefined) setBudgetMonth(data.budget_month);
        if (data.safety_buffer !== undefined) setSafetyBuffer(data.safety_buffer);
      }
    } catch (err) {
      console.warn("Could not fetch constants from PostgreSQL, using local defaults:", err);
    }
  };

  const fetchPersonaData = async () => {
    setPersonaLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/persona/${encodeURIComponent(userId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setPersonaData(data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch persona data in SettingsView:", err);
    } finally {
      setPersonaLoading(false);
    }
  };

  // Load existing personal information, constants, persona & feedback from PostgreSQL on mount
  useEffect(() => {
    fetchProfile();
    fetchConstants();
    fetchFeedbackList();
    fetchPersonaData();
  }, [userId]);

  const showNotification = (msg, error = false) => {
    setStatusMessage(msg);
    setIsError(error);
    setTimeout(() => {
      setStatusMessage('');
      setIsError(false);
    }, 3500);
  };

  // Save Constants to PostgreSQL ('constants' table)
  const handleSaveConstants = async (e) => {
    e.preventDefault();
    const bw = parseInt(budgetWeek, 10);
    const bm = parseInt(budgetMonth, 10);
    const sb = parseInt(safetyBuffer, 10);

    if (isNaN(bw) || isNaN(bm) || isNaN(sb)) {
      showNotification('Please enter valid numerical values for all constants.', true);
      return;
    }

    if (bw <= 0 || bm <= 0 || sb < 0) {
      showNotification('Budgets and safety buffer must be positive values.', true);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:8000/api/users/constants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          budget_week: bw,
          budget_month: bm,
          safety_buffer: sb
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to update constants.');

      showNotification('Budget & safety buffer constants saved successfully in Neon PostgreSQL!');
    } catch (err) {
      showNotification(err.message || 'Error updating constants in database.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Save Personal Information to PostgreSQL ('users' table)
  const handleSavePersonalInfo = async (e) => {
    e.preventDefault();
    if (mobileNumber && mobileNumber.length > 10) {
      showNotification('Mobile number cannot exceed 10 digits.', true);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:8000/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: name.trim(),
          profession: profession.trim(),
          mobile_number: mobileNumber.trim(),
          birthdate: birthdate || null
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to update profile.');

      showNotification('Personal information successfully updated in PostgreSQL database!');
    } catch (err) {
      showNotification(err.message || 'Error updating profile.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Submit AI Feedback to PostgreSQL ('ai_feedback' table)
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!userComment.trim()) {
      showNotification('Please enter your feedback or query comment.', true);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('http://localhost:8000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          feedback_action: feedbackAction,
          user_comment: userComment.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to submit feedback.');

      showNotification('AI Feedback successfully recorded in PostgreSQL database!');
      setUserComment('');
      fetchFeedbackList();
    } catch (err) {
      showNotification(err.message || 'Error submitting feedback.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Delete Account permanently
  const handleDeleteAccount = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Account deletion failed.');
      
      showNotification('Account deleted permanently.');
      if (onLogout) onLogout();
    } catch (err) {
      showNotification(err.message || 'Could not delete account.', true);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  // 4. Toggle Theme
  const toggleTheme = (selectedTheme) => {
    setTheme(selectedTheme);
    if (selectedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    showNotification(`Switched to ${selectedTheme} theme!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '860px', margin: '0 auto' }}>
      {/* Header */}
      <div>
        <h1 className="heading-lg" style={{ fontSize: '28px', marginBottom: '4px' }}>
          Account Settings
        </h1>
        <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
          Manage your personal profile, AI feedback preferences, theme display, and security settings.
        </p>
      </div>

      {/* Dynamic Status Alert Banner */}
      {statusMessage && (
        <div style={{
          backgroundColor: isError ? '#FEF2F2' : 'var(--safe-green-light)',
          border: `1px solid ${isError ? '#FCA5A5' : 'var(--safe-green-border)'}`,
          borderRadius: '12px',
          padding: '12px 16px',
          color: isError ? '#991B1B' : 'var(--safe-green)',
          fontSize: '14px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {isError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Tab Selector Navigation */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '8px'
      }}>
        <button
          onClick={() => setActiveTab('personal')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'personal' ? 'var(--brand-blue-light)' : 'transparent',
            color: activeTab === 'personal' ? 'var(--brand-blue)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'personal' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <User size={18} />
          <span>Personal Information</span>
        </button>

        <button
          onClick={() => setActiveTab('constants')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'constants' ? 'var(--brand-blue-light)' : 'transparent',
            color: activeTab === 'constants' ? 'var(--brand-blue)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'constants' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <Sliders size={18} />
          <span>Constants & Budgets</span>
        </button>

        <button
          onClick={() => setActiveTab('persona')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'persona' ? 'var(--brand-blue-light)' : 'transparent',
            color: activeTab === 'persona' ? 'var(--brand-blue)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'persona' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <Sparkles size={18} />
          <span>Financial Persona</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'feedback' ? 'var(--brand-blue-light)' : 'transparent',
            color: activeTab === 'feedback' ? 'var(--brand-blue)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'feedback' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <MessageSquareQuote size={18} />
          <span>AI Feedback</span>
        </button>

        <button
          onClick={() => setActiveTab('theme')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'theme' ? 'var(--brand-blue-light)' : 'transparent',
            color: activeTab === 'theme' ? 'var(--brand-blue)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'theme' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          <span>Theme & Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'account' ? '#FEF2F2' : 'transparent',
            color: activeTab === 'account' ? '#DC2626' : 'var(--text-secondary)',
            fontWeight: activeTab === 'account' ? '700' : '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <Trash2 size={18} />
          <span>Account & Security</span>
        </button>
      </div>

      {/* TAB 1: Personal Information Form (aligned with 'users' schema) */}
      {activeTab === 'personal' && (
        <form onSubmit={handleSavePersonalInfo} className="card" style={{ backgroundColor: '#FFFFFF', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 className="heading-sm" style={{ marginBottom: '4px' }}>Personal Profile</h3>
            <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
              Values entered here are synced directly into the Neon PostgreSQL <code>users</code> table.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* User ID (Read-only Shared Key) */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                User ID (Shared Primary Key)
              </label>
              <input
                type="text"
                value={userId}
                disabled
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'var(--text-muted)'
                }}
              />
            </div>

            {/* Email Address (Read-only Auth) */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  fontSize: '14px',
                  color: 'var(--text-muted)'
                }}
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Riya Sharma"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Mobile Number */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Mobile Number (up to 10 digits)
              </label>
              <input
                type="tel"
                value={mobileNumber}
                maxLength={10}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 9876543210"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Profession */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Profession
              </label>
              <input
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g. College Student / Software Engineer"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Birthdate */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Date of Birth
            </label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              <Save size={18} />
              <span>{isSaving ? 'Updating Database...' : 'Save Personal Information'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: Financial Constants & Budget Rules (aligned with 'constants' schema) */}
      {activeTab === 'constants' && (
        <form onSubmit={handleSaveConstants} className="card" style={{ backgroundColor: '#FFFFFF', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="heading-sm" style={{ marginBottom: '4px' }}>Financial Constants & Budget Rules</h3>
              <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
                Configure your weekly budget, monthly budget, and safety buffer. Saved directly to Neon PostgreSQL <code>constants</code> table.
              </p>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '12px',
              backgroundColor: '#E8F5E9',
              color: '#2E7D32',
              fontWeight: '700'
            }}>
              <Database size={12} />
              Neon DB Synced
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Weekly Budget */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Weekly Budget (₹ INR)
              </label>
              <input
                type="number"
                value={budgetWeek}
                onChange={(e) => setBudgetWeek(e.target.value)}
                required
                min="1"
                placeholder="e.g. 5000"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Target spending limit per week
              </span>
            </div>

            {/* Monthly Budget */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Monthly Budget (₹ INR)
              </label>
              <input
                type="number"
                value={budgetMonth}
                onChange={(e) => setBudgetMonth(e.target.value)}
                required
                min="1"
                placeholder="e.g. 10000"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontWeight: '700'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Overall monthly expense allocation
              </span>
            </div>
          </div>

          {/* Safety Buffer */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Safety Buffer (₹ INR)
            </label>
            <input
              type="number"
              value={safetyBuffer}
              onChange={(e) => setSafetyBuffer(e.target.value)}
              required
              min="0"
              placeholder="e.g. 3000"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                fontSize: '14px',
                fontWeight: '700',
                color: 'var(--brand-blue)'
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Emergency reserve deducted before computing dynamic Safe-to-Spend balance
            </span>
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              <Save size={18} />
              <span>{isSaving ? 'Saving Constants to Neon DB...' : 'Save Constants'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB: Financial Persona & Calibration */}
      {activeTab === 'persona' && (
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="heading-sm" style={{ marginBottom: '4px' }}>Financial Persona & Lifestyle Baseline</h3>
              <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
                Your calibrated commitments, income calendar, and derived risk profile stored in Neon PostgreSQL.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPersonaModalOpen(true)}
              className="btn btn-primary"
              style={{
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={16} />
              <span>{personaData?.setup_completed ? 'Re-calibrate Persona' : 'Calibrate Persona'}</span>
            </button>
          </div>

          {personaLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading financial persona from Neon DB...
            </div>
          ) : personaData?.setup_completed && personaData?.persona ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 4 Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700' }}>Committed Fixed Bills</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
                    ₹ {Number(personaData.persona.total_fixed_expense || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Protected from STS deductions</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700' }}>Variable Monthly Budget</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
                    ₹ {Number(personaData.persona.total_variable_expense || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Lifestyle baseline spend</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700' }}>Expected Monthly Inflow</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#10B981', marginTop: '4px' }}>
                    ₹ {Number(personaData.persona.total_expected_income || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Across active income streams</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700' }}>Net Monthly Surplus</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: Number(personaData.persona.net_monthly_surplus || 0) >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                    {Number(personaData.persona.net_monthly_surplus || 0) >= 0 ? '+' : ''}₹ {Number(personaData.persona.net_monthly_surplus || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Cash buffer after all spend</div>
                </div>
              </div>

              {/* Archetype & Risk Profile Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#4F46E5" />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase' }}>Risk Profile</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#312E81', marginTop: '4px', textTransform: 'capitalize' }}>
                    {personaData.persona.risk_profile}
                  </div>
                  <p style={{ fontSize: '12px', color: '#4338CA', margin: '4px 0 0 0' }}>
                    Calibrates shortfall detection urgency and 14-day trajectory warning thresholds.
                  </p>
                </div>

                <div style={{ padding: '18px', borderRadius: '14px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={18} color="#16A34A" />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#16A34A', textTransform: 'uppercase' }}>Spending Archetype</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#14532D', marginTop: '4px', textTransform: 'capitalize' }}>
                    {(personaData.persona.spending_archetype || '').replace('_', ' ')}
                  </div>
                  <p style={{ fontSize: '12px', color: '#15803D', margin: '4px 0 0 0' }}>
                    Informs Groq AI Guardian recommendations and counterfactual pre-purchase compromise tips.
                  </p>
                </div>
              </div>

              {/* Safety Buffer & Dependents Info */}
              <div style={{ padding: '16px 20px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                    Configured Safety Buffer: ₹ {Number(personaData.persona.user_safety_buffer_override || personaData.persona.suggested_safety_buffer || 3000).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Suggested: ₹ {Number(personaData.persona.suggested_safety_buffer || 3000).toLocaleString()} {personaData.persona.user_safety_buffer_override ? `(Manual override ₹${personaData.persona.user_safety_buffer_override})` : ''}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Dependents: <strong>{personaData.persona.number_of_dependents || 0}</strong> | Breadwinner: <strong>{personaData.persona.is_primary_breadwinner || 'no'}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '36px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                <Sparkles size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                  No Financial Persona Configured Yet
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '460px', margin: '6px 0 0 0' }}>
                  Calibrate your fixed obligations, variable lifestyle estimates, and scheduled income to activate personalized Safe-to-Spend calculations and accurate 14-day forecasts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPersonaModalOpen(true)}
                className="btn btn-primary"
                style={{ padding: '10px 22px', marginTop: '6px' }}
              >
                Start Guided Setup
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI Feedback Form (aligned with 'ai_feedback' schema) */}
      {activeTab === 'feedback' && (
        <form onSubmit={handleSubmitFeedback} className="card" style={{ backgroundColor: '#FFFFFF', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 className="heading-sm" style={{ marginBottom: '4px' }}>AI Guardian Feedback</h3>
            <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
              Feedback submitted here will be logged into the <code>ai_feedback</code> PostgreSQL table to improve Safe-to-Spend recommendation accuracy.
            </p>
          </div>

          {/* Feedback Action Choice */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              Recommendation Feedback Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { id: 'accepted', label: 'Accepted Recommendation' },
                { id: 'rejected', label: 'Rejected Recommendation' },
                { id: 'modified', label: 'Modified Spending Limit' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFeedbackAction(item.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: feedbackAction === item.id ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)',
                    backgroundColor: feedbackAction === item.id ? 'var(--brand-blue-light)' : '#FFFFFF',
                    color: feedbackAction === item.id ? 'var(--brand-blue)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Query / Comment */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              User Query or Comment
            </label>
            <textarea
              rows={4}
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder="e.g. The Safe-to-Spend recommendation for INR 1300 was accurate for my current food & transport expenses."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <button type="submit" disabled={isSaving} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              <Save size={18} />
              <span>{isSaving ? 'Logging Feedback...' : 'Submit AI Feedback'}</span>
            </button>
          </div>

          {/* Stored Feedback History from Neon PostgreSQL */}
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Active Feedback History (In-Context Prompt Rules)</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  These rules are automatically loaded into the LLM context during AI conversations.
                </p>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: '#E8F5E9',
                color: '#2E7D32',
                fontWeight: '700'
              }}>
                <Database size={12} />
                Neon DB Synced
              </span>
            </div>

            {feedbackList.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-canvas)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No feedback history recorded yet. Submit a feedback entry above to train your AI Guardian.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {feedbackList.map((fb, idx) => (
                  <div key={fb.feedback_id || idx} style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-canvas)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          backgroundColor: fb.feedback_action === 'accepted' ? '#ECFDF5' : (fb.feedback_action === 'rejected' ? '#FEF2F2' : '#EEF2FF'),
                          color: fb.feedback_action === 'accepted' ? '#065F46' : (fb.feedback_action === 'rejected' ? '#991B1B' : '#3730A3')
                        }}>
                          {fb.feedback_action}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {fb.created_at ? new Date(fb.created_at).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        "{fb.user_comment}"
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      )}

      {/* TAB 3: Theme & Appearance */}
      {activeTab === 'theme' && (
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 className="heading-sm" style={{ marginBottom: '4px' }}>Theme Preference</h3>
            <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
              Customize visual appearance between Light mode and Dark mode.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <button
              onClick={() => toggleTheme('light')}
              style={{
                padding: '24px',
                borderRadius: '16px',
                border: theme === 'light' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)',
                backgroundColor: theme === 'light' ? 'var(--brand-blue-light)' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              <Sun size={32} color={theme === 'light' ? 'var(--brand-blue)' : '#64748B'} />
              <span style={{ fontSize: '16px', fontWeight: '700', color: theme === 'light' ? 'var(--brand-blue)' : 'var(--text-primary)' }}>
                Light Mode
              </span>
            </button>

            <button
              onClick={() => toggleTheme('dark')}
              style={{
                padding: '24px',
                borderRadius: '16px',
                border: theme === 'dark' ? '2px solid var(--brand-blue)' : '1px solid var(--border-color)',
                backgroundColor: theme === 'dark' ? 'var(--brand-blue-light)' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              <Moon size={32} color={theme === 'dark' ? 'var(--brand-blue)' : '#64748B'} />
              <span style={{ fontSize: '16px', fontWeight: '700', color: theme === 'dark' ? 'var(--brand-blue)' : 'var(--text-primary)' }}>
                Dark Mode
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: Account Deletion (Danger Zone) */}
      {activeTab === 'account' && (
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid #FCA5A5' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', marginBottom: '4px' }}>
              <ShieldAlert size={22} />
              <h3 className="heading-sm" style={{ margin: 0, color: '#DC2626' }}>Danger Zone</h3>
            </div>
            <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
              Permanently delete your user account and purge all associated records from PostgreSQL.
            </p>
          </div>

          {!showDeleteConfirm ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#FEF2F2', borderRadius: '12px' }}>
              <div>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#991B1B', display: 'block' }}>Delete Account Permanently</span>
                <span style={{ fontSize: '13px', color: '#B91C1C' }}>Once deleted, your account and transactions cannot be recovered.</span>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Delete Account
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FCA5A5' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#991B1B' }}>Are you absolutely sure?</h4>
              <p style={{ fontSize: '13px', color: '#B91C1C', marginBottom: '16px' }}>
                This action is irreversible. All your financial data, forecasts, and history will be deleted.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#FFFFFF',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isSaving}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {isSaving ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Financial Persona Guided Setup Wizard Modal */}
      <PersonaWizardModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        activeUserId={userId}
        onPersonaSaved={() => {
          fetchProfile();
          fetchConstants();
          fetchPersonaData();
        }}
      />
    </div>
  );
}
