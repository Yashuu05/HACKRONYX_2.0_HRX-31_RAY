import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Wallet,
  Calendar,
  Users,
  Sliders,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Lock,
  Layers,
  HeartHandshake
} from 'lucide-react';

export default function PersonaWizardModal({
  isOpen,
  onClose,
  activeUserId = 'usr-001',
  onPersonaSaved
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Step 1: Fixed Expenses (Committed Obligations)
  // Clean empty inputs by default
  const [fixedExpenses, setFixedExpenses] = useState([
    { id: '1', label: 'Rent / Hostel Fee', category: 'rent', amount: '', due_day_of_month: 1, payment_mode: 'upi' },
    { id: '2', label: 'Loan / EMI / Laptop', category: 'emi', amount: '', due_day_of_month: 5, payment_mode: 'auto_debit' },
    { id: '3', label: 'WiFi & Utilities', category: 'utility', amount: '', due_day_of_month: 10, payment_mode: 'upi' },
    { id: '4', label: 'Streaming & Software', category: 'subscription', amount: '', due_day_of_month: 15, payment_mode: 'card' }
  ]);

  // Step 2: Variable Expenses (Lifestyle Baseline)
  const [variableExpenses, setVariableExpenses] = useState([
    { id: 'v1', label: 'Food, Groceries & Mess Canteen', category: 'food', expected_monthly_amount: '' },
    { id: 'v2', label: 'Commute, Metro & Fuel', category: 'transport', expected_monthly_amount: '' },
    { id: 'v3', label: 'Dining Out, Movies & Leisure', category: 'leisure', expected_monthly_amount: '' },
    { id: 'v4', label: 'Personal Care & Shopping', category: 'shopping', expected_monthly_amount: '' },
    { id: 'v5', label: 'Health, Medical & Pharmacy', category: 'medical', expected_monthly_amount: '' },
    { id: 'v6', label: 'Books & Skill Development', category: 'self_dev', expected_monthly_amount: '' }
  ]);

  // Step 3: Income Streams
  const [incomeSources, setIncomeSources] = useState([
    { id: 'inc1', source_name: 'Primary Salary / Stipend', income_type: 'salary', stream_nature: 'scheduled', expected_amount: '', expected_credit_day: 1, reliability: 'always_on_time' },
    { id: 'inc2', source_name: 'Secondary / Freelance / Allowance', income_type: 'freelance', stream_nature: 'variable', expected_amount: '', expected_credit_day: 15, reliability: 'irregular' }
  ]);

  // Step 4: Dependents & Cushion Preferences
  const [hasDependents, setHasDependents] = useState(false);
  const [numberOfDependents, setNumberOfDependents] = useState(0);
  const [isPrimaryBreadwinner, setIsPrimaryBreadwinner] = useState('no');
  const [monthlyDependentSupport, setMonthlyDependentSupport] = useState('');
  const [emergencyFundPreference, setEmergencyFundPreference] = useState('standard');

  // Step 5: Override for Safety Buffer
  const [bufferOverride, setBufferOverride] = useState('');

  // Fetch existing persona if previously configured
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setSaveSuccess(false);
    setSaveError('');

    fetch(`http://localhost:8000/api/persona/${encodeURIComponent(activeUserId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && data.persona) {
          const p = data.persona;
          if (Array.isArray(data.fixed_expenses) && data.fixed_expenses.length > 0) {
            setFixedExpenses(
              data.fixed_expenses.map((fe, idx) => ({
                id: fe.fixed_expense_id || `fe-${idx}`,
                label: fe.label || '',
                category: fe.category || 'other',
                amount: fe.amount != null ? String(fe.amount) : '',
                due_day_of_month: fe.due_day_of_month || 1,
                payment_mode: fe.payment_mode || 'upi'
              }))
            );
          }
          if (Array.isArray(data.variable_expenses) && data.variable_expenses.length > 0) {
            setVariableExpenses(
              data.variable_expenses.map((ve, idx) => ({
                id: ve.variable_expense_id || `ve-${idx}`,
                label: ve.label || '',
                category: ve.category || 'other',
                expected_monthly_amount: ve.expected_monthly_amount != null ? String(ve.expected_monthly_amount) : ''
              }))
            );
          }
          if (Array.isArray(data.income_sources) && data.income_sources.length > 0) {
            setIncomeSources(
              data.income_sources.map((inc, idx) => ({
                id: inc.income_source_id || `inc-${idx}`,
                source_name: inc.source_name || '',
                income_type: inc.income_type || 'salary',
                stream_nature: inc.stream_nature || 'scheduled',
                expected_amount: inc.expected_amount != null ? String(inc.expected_amount) : '',
                expected_credit_day: inc.expected_credit_day || 1,
                reliability: inc.reliability || 'always_on_time'
              }))
            );
          }
          setHasDependents(Boolean(p.has_dependents));
          setNumberOfDependents(p.number_of_dependents || 0);
          setIsPrimaryBreadwinner(p.is_primary_breadwinner || 'no');
          setEmergencyFundPreference(p.emergency_fund_preference || 'standard');
          if (p.user_safety_buffer_override != null && Number(p.user_safety_buffer_override) > 0) {
            setBufferOverride(String(p.user_safety_buffer_override));
          }
          if (Array.isArray(data.dependents) && data.dependents.length > 0) {
            const totalDepSupp = data.dependents.reduce((acc, d) => acc + (parseFloat(d.monthly_support_amount) || 0), 0);
            if (totalDepSupp > 0) setMonthlyDependentSupport(String(totalDepSupp));
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch existing persona, starting fresh:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, activeUserId]);

  // Real-time Live Calculations
  const liveMetrics = useMemo(() => {
    const fixedTotal = fixedExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const depSupport = hasDependents ? (parseFloat(monthlyDependentSupport) || 0) : 0;
    const totalCommittedFixed = fixedTotal + depSupport;

    const totalVariable = variableExpenses.reduce((sum, item) => sum + (parseFloat(item.expected_monthly_amount) || 0), 0);
    const totalIncome = incomeSources.reduce((sum, item) => sum + (parseFloat(item.expected_amount) || 0), 0);

    const netSurplus = totalIncome - (totalCommittedFixed + totalVariable);

    // Suggested Safety Buffer formula: max(F * 0.20, 2000) * multiplier
    let baseBuffer = Math.max(totalCommittedFixed * 0.20, 2000.0);
    let multiplier = 1.0;
    if (hasDependents && isPrimaryBreadwinner === 'yes') {
      multiplier = 1.5;
    } else if (hasDependents) {
      multiplier = 1.25;
    }
    if (emergencyFundPreference === 'conservative') multiplier += 0.2;
    if (emergencyFundPreference === 'aggressive') multiplier = Math.max(0.8, multiplier - 0.2);

    const suggestedBuffer = Math.round(baseBuffer * multiplier);

    // Risk Profile
    let riskProfile = 'balanced';
    if (totalIncome > 0) {
      const surplusRatio = netSurplus / totalIncome;
      if (surplusRatio < 0.15 || numberOfDependents >= 2 || isPrimaryBreadwinner === 'yes') {
        riskProfile = 'conservative';
      } else if (surplusRatio > 0.40 && numberOfDependents === 0) {
        riskProfile = 'flexible';
      }
    }

    // Spending Archetype
    let archetype = 'balanced';
    if (totalIncome > 0) {
      const varRatio = totalVariable / totalIncome;
      const surpRatio = netSurplus / totalIncome;
      if (varRatio < 0.30 && surpRatio > 0.40) {
        archetype = 'saver';
      } else if (varRatio > 0.60 || netSurplus <= 0) {
        archetype = 'free_spender';
      }
    }

    return {
      totalCommittedFixed,
      totalVariable,
      totalIncome,
      netSurplus,
      suggestedBuffer,
      riskProfile,
      archetype
    };
  }, [fixedExpenses, variableExpenses, incomeSources, hasDependents, numberOfDependents, isPrimaryBreadwinner, monthlyDependentSupport, emergencyFundPreference]);

  // Fixed Expense Actions
  const handleAddFixedExpense = () => {
    setFixedExpenses((prev) => [
      ...prev,
      {
        id: `fe-${Date.now()}`,
        label: '',
        category: 'other',
        amount: '',
        due_day_of_month: 1,
        payment_mode: 'upi'
      }
    ]);
  };

  const handleUpdateFixed = (id, field, value) => {
    setFixedExpenses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveFixed = (id) => {
    setFixedExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  // Variable Expense Actions
  const handleUpdateVariable = (id, value) => {
    setVariableExpenses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, expected_monthly_amount: value } : item))
    );
  };

  // Income Actions
  const handleAddIncome = () => {
    setIncomeSources((prev) => [
      ...prev,
      {
        id: `inc-${Date.now()}`,
        source_name: '',
        income_type: 'freelance',
        stream_nature: 'variable',
        expected_amount: '',
        expected_credit_day: 1,
        reliability: 'always_on_time'
      }
    ]);
  };

  const handleUpdateIncome = (id, field, value) => {
    setIncomeSources((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveIncome = (id) => {
    setIncomeSources((prev) => prev.filter((item) => item.id !== id));
  };

  // Submit to Neon PostgreSQL
  const handleSavePersona = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      // Build clean payload with non-empty active rows
      const validFixed = fixedExpenses
        .filter((fe) => (parseFloat(fe.amount) || 0) > 0 && fe.label.trim())
        .map((fe) => ({
          label: fe.label.trim(),
          category: fe.category || 'other',
          amount: parseFloat(fe.amount),
          due_day_of_month: parseInt(fe.due_day_of_month, 10) || 1,
          due_day_buffer: 2,
          payment_mode: fe.payment_mode || 'upi',
          is_active: true
        }));

      const validVariable = variableExpenses
        .filter((ve) => (parseFloat(ve.expected_monthly_amount) || 0) > 0)
        .map((ve) => ({
          label: ve.label.trim(),
          category: ve.category || 'other',
          expected_monthly_amount: parseFloat(ve.expected_monthly_amount),
          min_amount: Math.round(parseFloat(ve.expected_monthly_amount) * 0.8),
          max_amount: Math.round(parseFloat(ve.expected_monthly_amount) * 1.2),
          is_active: true
        }));

      const validIncome = incomeSources
        .filter((inc) => (parseFloat(inc.expected_amount) || 0) > 0 && inc.source_name.trim())
        .map((inc) => ({
          source_name: inc.source_name.trim(),
          income_type: inc.income_type || 'salary',
          stream_nature: inc.stream_nature || 'scheduled',
          expected_amount: parseFloat(inc.expected_amount),
          frequency: 'monthly',
          expected_credit_day: parseInt(inc.expected_credit_day, 10) || 1,
          credit_day_buffer: 1,
          reliability: inc.reliability || 'always_on_time',
          is_active: true
        }));

      const validDependents = [];
      if (hasDependents && (parseFloat(monthlyDependentSupport) || 0) > 0) {
        validDependents.push({
          relationship: 'family',
          age_group: 'adult',
          monthly_support_amount: parseFloat(monthlyDependentSupport),
          is_fixed_transfer: true
        });
      }

      const payload = {
        user_id: activeUserId,
        has_dependents: hasDependents,
        number_of_dependents: hasDependents ? parseInt(numberOfDependents, 10) || 0 : 0,
        is_primary_breadwinner: hasDependents ? isPrimaryBreadwinner : 'no',
        emergency_fund_preference: emergencyFundPreference,
        user_safety_buffer_override: bufferOverride ? parseFloat(bufferOverride) : null,
        fixed_expenses: validFixed,
        variable_expenses: validVariable,
        income_sources: validIncome,
        dependents: validDependents
      };

      const response = await fetch('http://localhost:8000/api/persona/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setSaveSuccess(true);
        if (onPersonaSaved) {
          onPersonaSaved(result);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setSaveError(result.detail || result.message || 'Failed to save financial persona. Please try again.');
      }
    } catch (err) {
      console.error('Error saving persona:', err);
      setSaveError('Network error connecting to SPECIFY backend server.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { num: 1, title: 'Fixed Obligations', desc: 'Committed rent & bills' },
    { num: 2, title: 'Variable Spend', desc: 'Lifestyle & food baseline' },
    { num: 3, title: 'Income Streams', desc: 'Salary, stipend & dates' },
    { num: 4, title: 'Dependents', desc: 'Family & cushion level' },
    { num: 5, title: 'Review & Confirm', desc: 'Calibrated fingerprint' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1080px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#EEF2FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4F46E5',
                border: '1px solid #C7D2FE'
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                Calibrate Financial Persona
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
                Establishes your mathematical baseline for Safe-to-Spend, Trajectory & Risk Guardian
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div
          style={{
            padding: '16px 28px',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#FFFFFF',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px'
          }}
        >
          {steps.map((st) => {
            const isCompleted = st.num < currentStep;
            const isCurrent = st.num === currentStep;
            return (
              <div
                key={st.num}
                onClick={() => {
                  if (st.num <= currentStep) setCurrentStep(st.num);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: st.num <= currentStep ? 'pointer' : 'default',
                  opacity: st.num <= currentStep ? 1 : 0.45,
                  padding: '4px 6px',
                  borderRadius: '8px',
                  backgroundColor: isCurrent ? '#F8FAFC' : 'transparent',
                  borderBottom: isCurrent ? '2px solid #4F46E5' : '2px solid transparent'
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: isCompleted ? '#10B981' : isCurrent ? '#4F46E5' : '#E2E8F0',
                    color: isCompleted || isCurrent ? '#FFFFFF' : '#64748B'
                  }}
                >
                  {isCompleted ? <Check size={14} /> : st.num}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: isCurrent ? '#4F46E5' : '#1E293B', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {st.title}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {st.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Body: Left Inputs + Right Live Telemetry */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Main Step Content Area */}
          <div
            style={{
              flex: 1,
              padding: '24px 28px',
              overflowY: 'auto',
              borderRight: '1px solid #E2E8F0'
            }}
          >
            {/* Step 1: Fixed Obligations */}
            {currentStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                      Step 1: Fixed Monthly Obligations
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                      These amounts are 100% protected by Safe-to-Spend so you never miss rent or bills.
                    </p>
                  </div>
                  <button
                    onClick={handleAddFixedExpense}
                    type="button"
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#EEF2FF',
                      border: '1px solid #C7D2FE',
                      color: '#4F46E5',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={14} />
                    <span>+ Add Bill</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {fixedExpenses.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr 40px',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '10px 14px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <input
                        type="text"
                        placeholder="e.g. Rent / Hostel Fee"
                        value={item.label}
                        onChange={(e) => handleUpdateFixed(item.id, 'label', e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: '500',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A'
                        }}
                      />
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateFixed(item.id, 'category', e.target.value)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '12px',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A'
                        }}
                      >
                        <option value="rent">Rent / Hostel</option>
                        <option value="emi">Loan / EMI</option>
                        <option value="utility">Utility / Bills</option>
                        <option value="subscription">Subscriptions</option>
                        <option value="insurance">Insurance</option>
                        <option value="academic">Tuition / Academic</option>
                        <option value="family_support">Family Support</option>
                        <option value="other">Other</option>
                      </select>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '9px', fontSize: '13px', color: '#64748B', fontWeight: '700' }}>₹</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={item.amount}
                          onChange={(e) => handleUpdateFixed(item.id, 'amount', e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '8px 10px 8px 24px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            fontWeight: '700',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Due Day</span>
                        <select
                          value={item.due_day_of_month}
                          onChange={(e) => handleUpdateFixed(item.id, 'due_day_of_month', parseInt(e.target.value, 10))}
                          style={{
                            padding: '8px 6px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '12px',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFixed(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#EF4444',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '12px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={16} color="#0284C7" />
                  <span>
                    Commitments are preserved from deduction. Even if you swipe your card, SPECIFY guarantees this cash remains available for your rent & bills.
                  </span>
                </div>
              </div>
            )}

            {/* Step 2: Variable Expenses */}
            {currentStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    Step 2: Expected Variable Lifestyle Spend
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                    Enter clean baseline estimates for your monthly discretionary categories.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  {variableExpenses.map((ve) => (
                    <div
                      key={ve.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>{ve.label}</span>
                        <span style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: '600' }}>{ve.category}</span>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '9px', fontSize: '13px', color: '#64748B', fontWeight: '700' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={ve.expected_monthly_amount}
                          onChange={(e) => handleUpdateVariable(ve.id, e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '8px 12px 8px 24px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            fontWeight: '700',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Income Streams */}
            {currentStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                      Step 3: Income Sources & Credit Schedule
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                      Enter your regular or variable credits. These populate your 30-day forward cash trajectory.
                    </p>
                  </div>
                  <button
                    onClick={handleAddIncome}
                    type="button"
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#EEF2FF',
                      border: '1px solid #C7D2FE',
                      color: '#4F46E5',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={14} />
                    <span>+ Add Inflow</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {incomeSources.map((inc) => (
                    <div
                      key={inc.id}
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1.2fr 1fr 1.2fr 36px',
                        gap: '10px',
                        alignItems: 'center'
                      }}
                    >
                      <input
                        type="text"
                        placeholder="e.g. Primary Salary / Stipend"
                        value={inc.source_name}
                        onChange={(e) => handleUpdateIncome(inc.id, 'source_name', e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          fontWeight: '600',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A'
                        }}
                      />
                      <select
                        value={inc.income_type}
                        onChange={(e) => handleUpdateIncome(inc.id, 'income_type', e.target.value)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '12px',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A'
                        }}
                      >
                        <option value="salary">Salary</option>
                        <option value="stipend">Stipend</option>
                        <option value="freelance">Freelance</option>
                        <option value="family_transfer">Allowance</option>
                        <option value="other">Other</option>
                      </select>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '9px', fontSize: '13px', color: '#64748B', fontWeight: '700' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={inc.expected_amount}
                          onChange={(e) => handleUpdateIncome(inc.id, 'expected_amount', e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '8px 10px 8px 24px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            fontWeight: '700',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Credit Day</span>
                        <select
                          value={inc.expected_credit_day}
                          onChange={(e) => handleUpdateIncome(inc.id, 'expected_credit_day', parseInt(e.target.value, 10))}
                          style={{
                            padding: '8px 6px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '12px',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <select
                        value={inc.reliability}
                        onChange={(e) => handleUpdateIncome(inc.id, 'reliability', e.target.value)}
                        style={{
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '11px',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A'
                        }}
                      >
                        <option value="always_on_time">Always On Time</option>
                        <option value="occasionally_late">Occasionally Late</option>
                        <option value="irregular">Irregular / Variable</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveIncome(inc.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#EF4444',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Dependents & Cushion */}
            {currentStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    Step 4: Financial Dependents & Risk Cushion
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                    Calibrates whether your safety cushion needs extra protection for family commitments.
                  </p>
                </div>

                <div
                  style={{
                    padding: '18px 20px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={20} color="#4F46E5" />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                          Do you financially support any dependents?
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          Includes children, elderly parents, or siblings you support regularly.
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setHasDependents(false);
                          setNumberOfDependents(0);
                          setIsPrimaryBreadwinner('no');
                          setMonthlyDependentSupport('');
                        }}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                          border: !hasDependents ? '2px solid #4F46E5' : '1px solid #CBD5E1',
                          backgroundColor: !hasDependents ? '#EEF2FF' : '#FFFFFF',
                          color: !hasDependents ? '#4F46E5' : '#64748B'
                        }}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHasDependents(true);
                          if (numberOfDependents === 0) setNumberOfDependents(1);
                        }}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                          border: hasDependents ? '2px solid #4F46E5' : '1px solid #CBD5E1',
                          backgroundColor: hasDependents ? '#EEF2FF' : '#FFFFFF',
                          color: hasDependents ? '#4F46E5' : '#64748B'
                        }}
                      >
                        Yes
                      </button>
                    </div>
                  </div>

                  {hasDependents && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                          Number of Dependents
                        </label>
                        <select
                          value={numberOfDependents}
                          onChange={(e) => setNumberOfDependents(parseInt(e.target.value, 10))}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        >
                          <option value={1}>1 Dependent</option>
                          <option value={2}>2 Dependents</option>
                          <option value={3}>3 Dependents</option>
                          <option value={4}>4+ Dependents</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                          Are you the Primary Breadwinner?
                        </label>
                        <select
                          value={isPrimaryBreadwinner}
                          onChange={(e) => setIsPrimaryBreadwinner(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        >
                          <option value="yes">Yes — Sole / Primary earner</option>
                          <option value="partial">Partial — Shared contribution</option>
                          <option value="no">No — Secondary contributor</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                          Monthly Family Transfer (₹)
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 5000"
                          min="0"
                          value={monthlyDependentSupport}
                          onChange={(e) => setMonthlyDependentSupport(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            fontWeight: '700',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#0284C7" />
                    <span>Emergency Buffer Preference</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {[
                      { key: 'aggressive', title: 'Lean Buffer (0.8x)', desc: 'Maximizes Safe-to-Spend for high cashflow agility' },
                      { key: 'standard', title: 'Balanced Buffer (1.0x)', desc: 'Standard 20% commitment protection' },
                      { key: 'conservative', title: 'Fortified Buffer (1.2x)', desc: 'Extra liquidity cushion for peace of mind' }
                    ].map((opt) => (
                      <div
                        key={opt.key}
                        onClick={() => setEmergencyFundPreference(opt.key)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: emergencyFundPreference === opt.key ? '2px solid #4F46E5' : '1px solid #CBD5E1',
                          backgroundColor: emergencyFundPreference === opt.key ? '#EEF2FF' : '#F8FAFC',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '700', color: emergencyFundPreference === opt.key ? '#4F46E5' : '#0F172A' }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                          {opt.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review & Financial Fingerprint */}
            {currentStep === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    Step 5: Review Your Calibrated Financial Fingerprint
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                    Verify your mathematical classification and optionally override your Safety Buffer.
                  </p>
                </div>

                {/* Fingerprint Hero Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Fixed Bills (F)</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
                      ₹ {liveMetrics.totalCommittedFixed.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Variable Spend (V)</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginTop: '4px' }}>
                      ₹ {liveMetrics.totalVariable.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Expected Inflow (I)</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#10B981', marginTop: '4px' }}>
                      ₹ {liveMetrics.totalIncome.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Monthly Surplus (S)</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: liveMetrics.netSurplus >= 0 ? '#10B981' : '#EF4444', marginTop: '4px' }}>
                      {liveMetrics.netSurplus >= 0 ? '+' : ''}₹ {liveMetrics.netSurplus.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Classification Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div style={{ padding: '16px', borderRadius: '14px', border: '1px solid #E0E7FF', backgroundColor: '#EEF2FF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={18} color="#4F46E5" />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase' }}>Risk Profile</span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#312E81', marginTop: '4px', textTransform: 'capitalize' }}>
                      {liveMetrics.riskProfile}
                    </div>
                    <p style={{ fontSize: '12px', color: '#4338CA', margin: '4px 0 0 0' }}>
                      {liveMetrics.riskProfile === 'conservative'
                        ? 'High protection mode: Lower surplus or dependent obligations calibrate vigilant shortfall warning triggers.'
                        : liveMetrics.riskProfile === 'flexible'
                        ? 'High agility mode: Ample cashflow surplus unlocks elevated Safe-to-Spend allowances.'
                        : 'Balanced mode: Standard 14-day liquidity equilibrium.'}
                    </p>
                  </div>

                  <div style={{ padding: '16px', borderRadius: '14px', border: '1px solid #DCFCE7', backgroundColor: '#F0FDF4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={18} color="#16A34A" />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#16A34A', textTransform: 'uppercase' }}>Spending Archetype</span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#14532D', marginTop: '4px', textTransform: 'capitalize' }}>
                      {liveMetrics.archetype.replace('_', ' ')}
                    </div>
                    <p style={{ fontSize: '12px', color: '#15803D', margin: '4px 0 0 0' }}>
                      {liveMetrics.archetype === 'saver'
                        ? 'Disciplined accumulator: Keeps lifestyle burn well below 30% of income.'
                        : liveMetrics.archetype === 'free_spender'
                        ? 'Velocity spender: High variable outflow triggers smart pre-purchase recommendations.'
                        : 'Equilibrated spender: Balanced distribution between essentials and lifestyle.'}
                    </p>
                  </div>
                </div>

                {/* Safety Buffer Calibration Card */}
                <div style={{ padding: '18px 20px', borderRadius: '16px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>
                        Suggested Safety Buffer: ₹ {liveMetrics.suggestedBuffer.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        Formula: max(20% of Fixed Commitments, ₹2,000) × {hasDependents ? (isPrimaryBreadwinner === 'yes' ? '1.5x (Breadwinner)' : '1.25x (Dependents)') : '1.0x'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                        Custom Override:
                      </label>
                      <div style={{ position: 'relative', width: '130px' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '9px', fontSize: '12px', color: '#64748B', fontWeight: '700' }}>₹</span>
                        <input
                          type="number"
                          placeholder={String(liveMetrics.suggestedBuffer)}
                          value={bufferOverride}
                          onChange={(e) => setBufferOverride(e.target.value)}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '8px 10px 8px 22px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            fontWeight: '700',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {saveSuccess && (
                  <div style={{ padding: '12px 16px', backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '13px', fontWeight: '700' }}>
                    <CheckCircle2 size={18} />
                    <span>Financial Persona successfully calibrated and saved to Neon PostgreSQL!</span>
                  </div>
                )}

                {saveError && (
                  <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontSize: '13px', fontWeight: '600' }}>
                    <AlertCircle size={18} />
                    <span>{saveError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar: Real-Time Live Telemetry Engine */}
          <div
            style={{
              width: '280px',
              backgroundColor: '#F8FAFC',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                <Sliders size={16} color="#4F46E5" />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Live Telemetry
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Total Fixed Obligations</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>
                    ₹ {liveMetrics.totalCommittedFixed.toLocaleString()}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Variable Monthly Budget</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>
                    ₹ {liveMetrics.totalVariable.toLocaleString()}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Expected Monthly Inflow</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#10B981', marginTop: '2px' }}>
                    ₹ {liveMetrics.totalIncome.toLocaleString()}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>Projected Surplus</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: liveMetrics.netSurplus >= 0 ? '#10B981' : '#EF4444', marginTop: '2px' }}>
                    {liveMetrics.netSurplus >= 0 ? '+' : ''}₹ {liveMetrics.netSurplus.toLocaleString()}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#EEF2FF', borderRadius: '10px', border: '1px solid #C7D2FE' }}>
                  <div style={{ fontSize: '11px', color: '#4F46E5', fontWeight: '700' }}>Target Safety Buffer</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#312E81', marginTop: '2px' }}>
                    ₹ {(bufferOverride ? parseFloat(bufferOverride) || liveMetrics.suggestedBuffer : liveMetrics.suggestedBuffer).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
              🔒 Directly synchronizes with Neon PostgreSQL. Recalculates Safe-to-Spend limits instantly across the entire dashboard.
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button
            type="button"
            disabled={currentStep === 1 || isSaving}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '700',
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              opacity: currentStep === 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#4F46E5',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                }}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePersona}
                style={{
                  padding: '11px 26px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: isSaving ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
                }}
              >
                {isSaving ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    <span>Calibrating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Save & Calibrate Financial Persona</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
