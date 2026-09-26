import React, { useState } from 'react';
import { X, PlusCircle, ArrowRight, Sparkles, MessageSquare, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Food & Beverages',
  'Travel',
  'Entertainment',
  'Clothing',
  'Academic',
  'Shopping',
  'Healthcare',
  'Utilities',
  'Subscriptions',
  'Rent',
  'Personal Care',
  'Gifts',
  'Others'
];

const INCOME_CATEGORIES = [
  'Salary',
  'Stipend',
  'Freelance',
  'Family Transfer',
  'Business Income',
  'Rewards',
  'Refund',
  'Passive Income',
  'Other Income'
];

const PAYMENT_METHODS = [
  'UPI',
  'Cash',
  'Debit Card',
  'Credit Card',
  'Cheque',
  'Net Banking'
];

export default function AddTransactionModal({ isOpen, onClose, onAddTransaction }) {
  // Modal Mode: 'form' | 'natural_language'
  const [entryMode, setEntryMode] = useState('form');

  // Form Mode State
  const [type, setType] = useState('expense'); // 'expense' | 'income'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food & Beverages');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Natural Language Mode State
  const [nlText, setNlText] = useState('');
  const [nlDate, setNlDate] = useState(new Date().toISOString().split('T')[0]);
  const [isParsing, setIsParsing] = useState(false);

  // Status Notification State
  const [feedbackStatus, setFeedbackStatus] = useState(null); // { type: 'success' | 'error', message: string, details?: object }

  if (!isOpen) return null;

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'expense') {
      setCategory('Food & Beverages');
    } else {
      setCategory('Salary');
    }
  };

  const resetState = () => {
    setAmount('');
    setDescription('');
    setCategory(type === 'income' ? 'Salary' : 'Food & Beverages');
    setPaymentMethod('UPI');
    setNlText('');
    setFeedbackStatus(null);
    setIsParsing(false);
  };

  const handleCloseModal = () => {
    resetState();
    onClose();
  };

  // 1. Submit Form Mode
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description) return;
    setFeedbackStatus(null);

    const payload = {
      user_id: 'usr-001',
      activity_type: type,
      category: category,
      amount: parseFloat(amount),
      description: description.trim(),
      transaction_date: date,
      transaction_time: new Date().toTimeString().split(' ')[0],
      payment_method: paymentMethod.toLowerCase().replace(/\s+/g, '_'),
      status: 'Completed'
    };

    try {
      const response = await fetch('http://localhost:8000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        const createdTx = data.transaction;
        onAddTransaction({
          id: createdTx.transaction_id,
          description: createdTx.description,
          amount: createdTx.amount,
          type: createdTx.activity_type,
          category: createdTx.category,
          date: createdTx.transaction_date,
          time: createdTx.transaction_time,
          status: createdTx.status
        });
        setFeedbackStatus({
          type: 'success',
          message: 'Transaction added successfully!'
        });
        setTimeout(() => handleCloseModal(), 1200);
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'API POST failed');
      }
    } catch (err) {
      console.warn('PostgreSQL add error:', err);
      // Fallback
      onAddTransaction({
        id: `tx-${Date.now()}`,
        description: description.trim(),
        amount: parseFloat(amount),
        type: type,
        category: category,
        date: date,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Completed'
      });
      setFeedbackStatus({
        type: 'success',
        message: 'Transaction added locally!'
      });
      setTimeout(() => handleCloseModal(), 1200);
    }
  };

  // 2. Submit Natural Language Mode
  const handleNLSubmit = async (e) => {
    e.preventDefault();
    if (!nlText.trim()) return;
    setIsParsing(true);
    setFeedbackStatus(null);

    try {
      const response = await fetch('http://localhost:8000/api/transactions/natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: nlText.trim(),
          transaction_date: nlDate,
          user_id: 'usr-001'
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || 'Failed to parse and record natural language transaction.');
      }

      const data = await response.json();
      if (data.status === 'success') {
        const createdTx = data.transaction;
        const parsedRes = data.parsed_result || {};

        onAddTransaction({
          id: createdTx.transaction_id,
          description: createdTx.description,
          amount: createdTx.amount,
          type: createdTx.activity_type,
          category: createdTx.category,
          date: createdTx.transaction_date,
          time: createdTx.transaction_time,
          status: createdTx.status
        });

        setFeedbackStatus({
          type: 'success',
          message: 'Transaction added successfully!',
          details: {
            activity_type: createdTx.activity_type,
            amount: createdTx.amount,
            category: createdTx.category,
            description: createdTx.description,
            payment_method: createdTx.payment_method
          }
        });

        setTimeout(() => handleCloseModal(), 1800);
      } else {
        throw new Error(data.message || 'Natural language processing failed.');
      }
    } catch (err) {
      console.error('Natural language API error:', err);
      setFeedbackStatus({
        type: 'error',
        message: `Transaction failed: ${err.message}`
      });
    } finally {
      setIsParsing(false);
    }
  };

  const samplePrompts = [
    "spent INR 500 pizza cash",
    "spent INR 350 on meal via UPI",
    "INR 30000 salary via cheque",
    "bought shoes for Rs 2500 via UPI"
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card animate-fade-in" style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '32px',
        maxWidth: '520px',
        width: '92%',
        position: 'relative',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border-color)'
      }}>
        {/* Close Button */}
        <button
          onClick={handleCloseModal}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: entryMode === 'natural_language' ? '#EEF2FF' : 'var(--safe-green-light)',
              color: entryMode === 'natural_language' ? 'var(--brand-blue)' : 'var(--safe-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {entryMode === 'natural_language' ? <Sparkles size={20} /> : <PlusCircle size={20} />}
            </div>
            <h3 className="heading-sm" style={{ margin: 0, fontSize: '20px' }}>Add New Transaction</h3>
          </div>
          <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
            Log transactions via standard form or natural language text.
          </p>
        </div>

        {/* Mode Selector Tabs (Form vs Natural Language) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          backgroundColor: 'var(--bg-subtle)',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => setEntryMode('form')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: entryMode === 'form' ? '#FFFFFF' : 'transparent',
              color: entryMode === 'form' ? 'var(--brand-blue)' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: entryMode === 'form' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>Form Input</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('natural_language')}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: entryMode === 'natural_language' ? '#FFFFFF' : 'transparent',
              color: entryMode === 'natural_language' ? 'var(--brand-blue)' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: entryMode === 'natural_language' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={14} color="var(--brand-blue)" />
            <span>Natural Language</span>
          </button>
        </div>

        {/* Status Notification Banner */}
        {feedbackStatus && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: '600',
            backgroundColor: feedbackStatus.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: feedbackStatus.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${feedbackStatus.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            {feedbackStatus.type === 'success' ? <CheckCircle size={18} style={{ marginTop: '2px', flexShrink: 0 }} /> : <AlertCircle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />}
            <div>
              <div>{feedbackStatus.message}</div>
              {feedbackStatus.details && (
                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
                  Extracted: {feedbackStatus.details.activity_type.toUpperCase()} • ₹{feedbackStatus.details.amount} for "{feedbackStatus.details.description}" ({feedbackStatus.details.category}) via {feedbackStatus.details.payment_method.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 1: FORM MODE */}
        {/* ============================================================ */}
        {entryMode === 'form' && (
          <form onSubmit={handleFormSubmit}>
            {/* Type Toggle Switch */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              backgroundColor: 'var(--bg-subtle)',
              padding: '4px',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: type === 'expense' ? '#FFFFFF' : 'transparent',
                  color: type === 'expense' ? 'var(--caution-amber)' : 'var(--text-secondary)',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: type === 'expense' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                Expense (-)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: type === 'income' ? '#FFFFFF' : 'transparent',
                  color: type === 'income' ? 'var(--safe-green)' : 'var(--text-secondary)',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: type === 'income' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                Income (+)
              </button>
            </div>

            {/* 1. Amount */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '15px',
                  fontWeight: '700',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none'
                }}
              />
            </div>

            {/* 2. Description */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Swiggy Lunch Order / Monthly Stipend"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none'
                }}
              />
            </div>

            {/* 3. Category */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Category ({type === 'expense' ? 'Expense' : 'Income'})
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  backgroundColor: '#FFFFFF',
                  outline: 'none'
                }}
              >
                {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Payment Method */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Transaction Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  backgroundColor: '#FFFFFF',
                  outline: 'none'
                }}
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Transaction Date */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Transaction Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={type === 'expense' ? 'btn btn-primary' : 'btn btn-emerald'}
                style={{ flex: 1, padding: '10px' }}
              >
                <span>Add Transaction</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* MODE 2: NATURAL LANGUAGE MODE */}
        {/* ============================================================ */}
        {entryMode === 'natural_language' && (
          <form onSubmit={handleNLSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Enter Transaction Statement (English)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. spent INR 500 pizza cash"
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Quick Sample Suggestions */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Quick Examples:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {samplePrompts.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNlText(sample)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-canvas)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>

            {/* Date Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Transaction Date
              </label>
              <input
                type="date"
                value={nlDate}
                onChange={(e) => setNlDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn btn-secondary"
                disabled={isParsing}
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isParsing || !nlText.trim()}
                style={{ flex: 1, padding: '12px', backgroundColor: 'var(--brand-blue)' }}
              >
                {isParsing ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Parsing & Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Add via Natural Language</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
