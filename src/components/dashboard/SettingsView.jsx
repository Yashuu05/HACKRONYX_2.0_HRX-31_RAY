import React, { useState, useEffect } from 'react';
import { User, MessageSquareQuote, Trash2, Sun, Moon, Save, CheckCircle2, AlertTriangle, ShieldAlert, Sliders, Database } from 'lucide-react';

export default function SettingsView({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'constants' | 'feedback' | 'account' | 'theme'
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'

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

  // Status Alerts
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const userId = currentUser?.id || 'usr-001';

  // Load existing personal information & constants from PostgreSQL on mount
  useEffect(() => {
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

    fetchProfile();
    fetchConstants();
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
    </div>
  );
}
