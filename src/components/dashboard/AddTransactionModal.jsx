import React, { useState } from 'react';
import { X, PlusCircle, ArrowRight, Sparkles, MessageSquare, CheckCircle, AlertCircle, RefreshCw, UploadCloud, FileSpreadsheet, FileText, Database } from 'lucide-react';

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

export default function AddTransactionModal({ isOpen, onClose, onAddTransaction, currentUser }) {
  const activeUserId = currentUser?.user_id || currentUser?.id || 'usr-001';

  // Modal Mode: 'form' | 'natural_language' | 'file_upload'
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

  // File Upload Mode State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
    setSelectedFile(null);
    setUploadSummary(null);
    setFeedbackStatus(null);
    setIsParsing(false);
    setIsUploading(false);
  };

  const handleCloseModal = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        setFeedbackStatus({
          type: 'error',
          message: 'Invalid file type. Please select a .csv or .xlsx bank statement file.'
        });
        return;
      }
      setSelectedFile(file);
      setFeedbackStatus(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        setFeedbackStatus({
          type: 'error',
          message: 'Invalid file type. Please select a .csv or .xlsx file.'
        });
        return;
      }
      setSelectedFile(file);
      setFeedbackStatus(null);
    }
  };

  // 1. Submit Form Mode
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description) return;
    setFeedbackStatus(null);

    const payload = {
      user_id: activeUserId,
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
          user_id: activeUserId
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || 'Failed to parse and record natural language transaction.');
      }

      const data = await response.json();
      if (data.status === 'success') {
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

  // 3. Submit File Upload Mode (Ingestion Pipeline)
  const handleFileUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setFeedbackStatus(null);
    setUploadSummary(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('user_id', activeUserId);

    try {
      const response = await fetch('http://localhost:8000/api/transactions/upload-csv', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Dataset ingestion failed.');
      }

      const data = await response.json();
      if (data.status === 'success' || data.status === 'warning') {
        const summary = data.summary || {};
        const sampleRecords = data.sample_cleaned_records || [];

        setUploadSummary(summary);
        setFeedbackStatus({
          type: 'success',
          message: data.message || 'Dataset uploaded, cleaned, and ingested into Firestore NoSQL DB!'
        });

        // Update frontend state with ingested records
        if (sampleRecords.length > 0) {
          sampleRecords.forEach((rec, idx) => {
            onAddTransaction({
              id: rec.transaction_id || `tx-csv-${Date.now()}-${idx}`,
              description: rec.description || rec.merchant || 'Uploaded Transaction',
              amount: rec.amount,
              type: rec.activity_type,
              category: rec.category,
              date: rec.transaction_date,
              time: '12:00:00',
              status: rec.status || 'Completed'
            });
          });
        }

        setTimeout(() => {
          handleCloseModal();
        }, 2200);
      } else {
        throw new Error(data.message || 'CSV Ingestion failed.');
      }
    } catch (err) {
      console.error('Dataset Upload Error:', err);
      setFeedbackStatus({
        type: 'error',
        message: `Ingestion failed: ${err.message}`
      });
    } finally {
      setIsUploading(false);
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
        maxWidth: '560px',
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
              backgroundColor: entryMode === 'file_upload' ? '#F0F9FF' : (entryMode === 'natural_language' ? '#EEF2FF' : 'var(--safe-green-light)'),
              color: entryMode === 'file_upload' ? '#0284C7' : (entryMode === 'natural_language' ? 'var(--brand-blue)' : 'var(--safe-green)'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {entryMode === 'file_upload' ? <UploadCloud size={20} /> : (entryMode === 'natural_language' ? <Sparkles size={20} /> : <PlusCircle size={20} />)}
            </div>
            <h3 className="heading-sm" style={{ margin: 0, fontSize: '20px' }}>Add New Transaction</h3>
          </div>
          <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
            Log single transactions, use AI natural language, or upload CSV/XLSX datasets.
          </p>
        </div>

        {/* 3-Tab Mode Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.2fr',
          gap: '4px',
          backgroundColor: 'var(--bg-subtle)',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => setEntryMode('form')}
            style={{
              padding: '8px 6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: entryMode === 'form' ? '#FFFFFF' : 'transparent',
              color: entryMode === 'form' ? 'var(--brand-blue)' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: entryMode === 'form' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <span>Form Input</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('natural_language')}
            style={{
              padding: '8px 6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: entryMode === 'natural_language' ? '#FFFFFF' : 'transparent',
              color: entryMode === 'natural_language' ? 'var(--brand-blue)' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: entryMode === 'natural_language' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Sparkles size={13} color="var(--brand-blue)" />
            <span>AI Natural</span>
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('file_upload')}
            style={{
              padding: '8px 6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: entryMode === 'file_upload' ? '#FFFFFF' : 'transparent',
              color: entryMode === 'file_upload' ? '#0284C7' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: entryMode === 'file_upload' ? 'var(--shadow-sm)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <UploadCloud size={14} color="#0284C7" />
            <span>Upload File</span>
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

        {/* ============================================================ */}
        {/* MODE 3: FILE UPLOAD MODE (CSV / XLSX Ingestion Engine) */}
        {/* ============================================================ */}
        {entryMode === 'file_upload' && (
          <form onSubmit={handleFileUploadSubmit}>
            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragOver ? '#0284C7' : (selectedFile ? '#0284C7' : 'var(--border-color)')}`,
                backgroundColor: isDragOver ? '#F0F9FF' : (selectedFile ? '#F8FAFC' : 'var(--bg-canvas)'),
                borderRadius: '16px',
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '16px',
                position: 'relative'
              }}
              onClick={() => document.getElementById('file-upload-input').click()}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {!selectedFile ? (
                <>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#E0F2FE',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}>
                    <UploadCloud size={24} />
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Click to upload or drag & drop file
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Supports bank statement formats: <strong>.csv</strong> or <strong>.xlsx</strong> (Max 10MB)
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileSpreadsheet size={22} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB • Bank Statement Feed
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '6px'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Upload Summary Stats (if completed) */}
            {uploadSummary && (
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={14} color="#0284C7" />
                  <span>Dataset Ingestion & Cleaning Report</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    Rows Read: <strong>{uploadSummary.total_rows_read}</strong>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    Duplicates Removed: <strong style={{ color: '#D97706' }}>{uploadSummary.duplicates_removed}</strong>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    Nulls Sanitized: <strong style={{ color: '#2563EB' }}>{uploadSummary.nulls_filled_count}</strong>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    Ingested to Firestore: <strong style={{ color: '#059669' }}>{uploadSummary.final_records_count}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Ingestion Engine Rules Feature Box */}
            <div style={{
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#0369A1',
              lineHeight: '1.5'
            }}>
              <strong style={{ color: '#0284C7' }}>⚡ Data Ingestion Rules:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li>Splits hyphenated narrations (`Method-Merchant-Description`).</li>
                <li>Fills missing text fields with <code>"NA"</code> or <code>"NAN"</code>.</li>
                <li>Eliminates duplicate transactions and writes strictly to <strong>Firestore NoSQL DB</strong>.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn btn-secondary"
                disabled={isUploading}
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isUploading || !selectedFile}
                style={{ flex: 1, padding: '12px', backgroundColor: '#0284C7' }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Cleaning & Saving...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>Upload & Ingest Dataset</span>
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

