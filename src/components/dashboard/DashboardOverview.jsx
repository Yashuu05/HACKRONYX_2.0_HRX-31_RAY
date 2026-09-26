import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Lock,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  PlusCircle,
  FileText,
  Clock,
  RefreshCw,
  Database
} from 'lucide-react';
import ShortfallRiskCard from './ShortfallRiskCard';

export default function DashboardOverview({ transactions, forecastData, onOpenAddModal, onNavigateToChat }) {
  const [horizonDays, setHorizonDays] = useState(14);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [recommendationStatus, setRecommendationStatus] = useState(null); // 'accepted' | 'rejected' | 'modified'
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState(null);

  // User Constants State (constants table in Neon DB)
  const [userConstants, setUserConstants] = useState({
    budget_week: 5000,
    budget_month: 10000,
    safety_buffer: 3000
  });

  // Summary State (calculated from transactions table in Neon DB)
  const [summaryData, setSummaryData] = useState(null);

  // Fetch top 5 recent account transactions directly from Neon PostgreSQL
  const fetchRecentTransactions = async () => {
    setLoadingRecent(true);
    setRecentError(null);
    try {
      const response = await fetch('http://localhost:8000/api/transactions/recent?user_id=usr-001&limit=5');
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      if (data.status === 'success') {
        setRecentTransactions(data.transactions || []);
      } else {
        throw new Error(data.message || 'Failed to fetch recent transactions');
      }
    } catch (err) {
      console.warn('Neon DB recent transactions fetch fallback:', err);
      setRecentError(err.message);
    } finally {
      setLoadingRecent(false);
    }
  };

  // Fetch user constants (Budget & Safety Buffer) from Neon PostgreSQL
  const fetchUserConstants = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/users/constants/usr-001');
      if (response.ok) {
        const data = await response.json();
        if (data && (data.budget_week !== undefined || data.safety_buffer !== undefined)) {
          setUserConstants(data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch user constants in DashboardOverview:', err);
    }
  };

  // Fetch real-time summary calculations (net balance, total income, total spendings) from Neon PostgreSQL
  const fetchSummaryData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/transactions/summary?user_id=usr-001');
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setSummaryData(data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch transaction summary from Neon DB:', err);
    }
  };

  useEffect(() => {
    fetchRecentTransactions();
    fetchUserConstants();
    fetchSummaryData();
  }, [transactions]);

  // Fallback to local props if DB fetch hasn't returned records or is offline
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const displayRecent = (Array.isArray(recentTransactions) && recentTransactions.length > 0)
    ? recentTransactions
    : safeTransactions.slice(0, 5).map(t => ({
        id: t.id,
        description: t.description,
        category: t.category,
        type: t.type,
        amount: t.amount,
        date: t.date,
        time: t.time
      }));

  // Calculate fallback totals from local props if DB summary endpoint is offline
  const localTotalIncome = safeTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const localTotalSpendings = safeTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  // Metrics dynamically fetched / calculated from Neon PostgreSQL SQL Aggregation
  const totalIncome = summaryData !== null && summaryData !== undefined ? Number(summaryData.total_income || 0) : localTotalIncome;
  const totalSpendings = summaryData !== null && summaryData !== undefined ? Number(summaryData.total_spendings || 0) : localTotalSpendings;
  const currentBankBalance = summaryData !== null && summaryData !== undefined ? Number(summaryData.net_balance || 0) : (localTotalIncome - localTotalSpendings);
  
  const protectedCommitments = 1200; // Rent + Mess
  const safetyBuffer = Number(userConstants?.safety_buffer) || 3000;
  const budgetWeek = Number(userConstants?.budget_week) || 5000;
  const budgetMonth = Number(userConstants?.budget_month) || 10000;
  
  // Safe-to-Spend formula: net_balance - protected_commitments - safety_buffer
  const safeToSpend = Math.max(0, currentBankBalance - protectedCommitments - safetyBuffer);

  const formatCurrency = (val, minDecimals = 2) => {
    const num = Number(val || 0);
    return isNaN(num) ? '0.00' : num.toLocaleString('en-IN', { minimumFractionDigits: minDecimals });
  };

  const safeForecastData = Array.isArray(forecastData) ? forecastData : [];
  const displayedData = horizonDays === 7 ? safeForecastData.slice(0, 7) : safeForecastData;

  // SVG Chart math
  const width = 680;
  const height = 220;
  const padding = 28;
  const maxVal = 12000;
  const minVal = 2000;

  const getX = (i) => padding + (i * (width - 2 * padding)) / Math.max(1, displayedData.length - 1);
  const getY = (val) => height - padding - (((Number(val) || 0) - minVal) / (maxVal - minVal)) * (height - 2 * padding);

  const expectedPoints = displayedData.map((d, i) => `${getX(i)},${getY(d.expected)}`).join(' L ');
  const bestPoints = displayedData.map((d, i) => `${getX(i)},${getY(d.best)}`);
  const worstPoints = [...displayedData].reverse().map((d, i) => {
    const origIdx = displayedData.length - 1 - i;
    return `${getX(origIdx)},${getY(d.worst)}`;
  });
  const confidenceBandPath = displayedData.length > 0 ? `M ${bestPoints.join(' L ')} L ${worstPoints.join(' L ')} Z` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="heading-lg" style={{ fontSize: '28px', marginBottom: '4px' }}>
            Liquidity Guardian Overview
          </h1>
          <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
            Real-time liquidity forecasting & Safe-to-Spend intelligence for Riya Sharma.
          </p>
        </div>
        <button onClick={onOpenAddModal} className="btn btn-primary" style={{ padding: '10px 20px' }}>
          <PlusCircle size={18} />
          <span>+ Add Transaction</span>
        </button>
      </div>

      {/* 6-Stat Hero Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '16px'
      }}>
        {/* Metric 1: Net Bank Balance (total_income - total_expense) */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-blue)', marginBottom: '8px' }}>
            <Wallet size={18} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Bank Balance</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: currentBankBalance >= 0 ? 'var(--text-primary)' : '#DC2626' }}>
            ₹ {formatCurrency(currentBankBalance)}
          </div>
          <div style={{ fontSize: '11px', color: '#2E7D32', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={10} />
            Net Balance (Neon DB)
          </div>
        </div>

        {/* Metric 2: Dynamic Safe-to-Spend */}
        <div className="card" style={{
          backgroundColor: 'var(--safe-green-light)',
          borderColor: 'var(--safe-green-border)',
          padding: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--safe-green)', marginBottom: '8px' }}>
            <ShieldCheck size={18} />
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--safe-green)' }}>Safe-to-Spend Today</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--safe-green)' }}>
            ₹ {formatCurrency(safeToSpend)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--safe-green)', fontWeight: '600', marginTop: '4px' }}>
            Protected & Buffer Intact
          </div>
        </div>

        {/* Metric 3: Total Income */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--safe-green)', marginBottom: '8px' }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Total Income</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--safe-green)' }}>
            + ₹ {formatCurrency(totalIncome)}
          </div>
          <div style={{ fontSize: '11px', color: '#2E7D32', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={10} />
            Neon DB Sum
          </div>
        </div>

        {/* Metric 4: Total Spendings */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--caution-amber)', marginBottom: '8px' }}>
            <TrendingDown size={18} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Total Spendings</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
            - ₹ {formatCurrency(totalSpendings)}
          </div>
          <div style={{ fontSize: '11px', color: '#2E7D32', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={10} />
            Neon DB Sum
          </div>
        </div>

        {/* Metric 5: Protected Commitments */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-blue)', marginBottom: '8px' }}>
            <Lock size={18} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Protected Bills</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
            ₹ {formatCurrency(protectedCommitments)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Rent & Mess Reserved
          </div>
        </div>

        {/* Metric 6: Safety Buffer (Configured via Neon DB Constants) */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--caution-amber)', marginBottom: '8px' }}>
            <Sliders size={18} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Safety Buffer</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--brand-blue)' }}>
            ₹ {formatCurrency(safetyBuffer)}
          </div>
          <div style={{ fontSize: '11px', color: '#2E7D32', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={10} />
            Neon DB Configured
          </div>
        </div>
      </div>

      {/* User Configured Budget Constants Bar */}
      <div className="card" style={{ backgroundColor: '#F8FAFC', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={16} color="var(--brand-blue)" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Configured Budget Constants (Neon DB):</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', fontWeight: '600' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Weekly Budget: <strong style={{ color: 'var(--text-primary)' }}>₹ {formatCurrency(budgetWeek, 0)}</strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Monthly Budget: <strong style={{ color: 'var(--text-primary)' }}>₹ {formatCurrency(budgetMonth, 0)}</strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Safety Reserve: <strong style={{ color: 'var(--brand-blue)' }}>₹ {formatCurrency(safetyBuffer, 0)}</strong>
          </span>
        </div>
      </div>

      {/* Shortfall Risk Detection & Prevention Card */}
      <ShortfallRiskCard onNavigateToChat={onNavigateToChat} />

      {/* Main Grid: Forecast Chart (Left) + Active Alerts & Recommendations (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.6fr 1fr',
        gap: '24px'
      }}>
        {/* Left Card: 7-14 Day Liquidity Forecast Chart */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 className="heading-sm" style={{ marginBottom: '2px' }}>
                7–14 Day Liquidity Forecast
              </h3>
              <p className="body-sm" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Deterministic cash trajectory with best, expected, and worst-case confidence bounds.
              </p>
            </div>

            <div style={{ display: 'flex', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', padding: '3px' }}>
              <button
                onClick={() => setHorizonDays(7)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: horizonDays === 7 ? '#FFFFFF' : 'transparent',
                  color: horizonDays === 7 ? 'var(--brand-blue)' : 'var(--text-secondary)',
                  boxShadow: horizonDays === 7 ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer'
                }}
              >
                7 Days
              </button>
              <button
                onClick={() => setHorizonDays(14)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: horizonDays === 14 ? '#FFFFFF' : 'transparent',
                  color: horizonDays === 14 ? 'var(--brand-blue)' : 'var(--text-secondary)',
                  boxShadow: horizonDays === 14 ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer'
                }}
              >
                14 Days
              </button>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div style={{ position: 'relative', width: '100%', height: `${height}px`, backgroundColor: '#FAFAFA', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1={getY(8000)} x2={width} y2={getY(8000)} stroke="#E2E8F0" strokeDasharray="3 3" />
              <line x1="0" y1={getY(5000)} x2={width} y2={getY(5000)} stroke="#E2E8F0" strokeDasharray="3 3" />
              
              {/* Buffer Threshold */}
              <line x1="0" y1={getY(4000)} x2={width} y2={getY(4000)} stroke="#FDE68A" strokeWidth="2" strokeDasharray="4 4" />

              {/* Confidence Polygon */}
              <path d={confidenceBandPath} fill="#EFF6FF" opacity="0.6" />

              {/* Expected Line */}
              <path d={`M ${expectedPoints}`} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data Points */}
              {displayedData.map((d, i) => (
                <g key={i}>
                  <circle
                    cx={getX(i)}
                    cy={getY(d.expected)}
                    r={hoveredPoint === i ? 6 : 4}
                    fill={d.type === 'essential' ? '#D97706' : d.type === 'income' ? '#059669' : '#2563EB'}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    onMouseEnter={() => setHoveredPoint(i)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  />
                </g>
              ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint !== null && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: `${Math.min(Math.max(getX(hoveredPoint) - 80, 10), width - 160)}px`,
                backgroundColor: 'var(--text-primary)',
                color: '#FFFFFF',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                boxShadow: 'var(--shadow-lg)',
                pointerEvents: 'none',
                zIndex: 10
              }}>
                <div style={{ fontWeight: '700' }}>{displayedData[hoveredPoint].day}</div>
                <div>{displayedData[hoveredPoint].event}</div>
                <div style={{ color: '#93C5FD', fontWeight: '600', marginTop: '2px' }}>
                  Expected: ₹{displayedData[hoveredPoint].expected.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Active Risk Alert & Recommendation Engine */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Risk Alert Box */}
          <div style={{
            backgroundColor: 'var(--caution-amber-light)',
            border: '1px solid var(--caution-amber-border)',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                color: 'var(--caution-amber)',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex'
              }}>
                <AlertTriangle size={18} />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Early Shortfall Warning
              </h4>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 12px 0' }}>
              <strong>Trace Reason:</strong> Delayed freelance stipend expected on Oct 25 + Mess Fee debit on Oct 24 may breach safety buffer by ₹350.
            </p>

            {/* Recommendation Feedback Control Box */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '4px' }}>
                System Recommended Action
              </div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
                "Apply ₹150/day spend limit for 4 days to absorb buffer deficit."
              </p>

              {recommendationStatus ? (
                <div style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: recommendationStatus === 'accepted' ? 'var(--safe-green)' : 'var(--caution-amber)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>Feedback recorded: {recommendationStatus.toUpperCase()} (Weight updated)</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setRecommendationStatus('accepted')}
                    className="btn btn-sm"
                    style={{ backgroundColor: 'var(--safe-green-light)', borderColor: 'var(--safe-green-border)', color: 'var(--safe-green)', fontSize: '12px', flex: 1 }}
                  >
                    <ThumbsUp size={14} />
                    <span>Accept</span>
                  </button>

                  <button
                    onClick={() => setRecommendationStatus('rejected')}
                    className="btn btn-sm"
                    style={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px', flex: 1 }}
                  >
                    <ThumbsDown size={14} />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Health Quick Status */}
          <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="var(--brand-blue)" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Last Sync</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Just now (Live engine)</div>
              </div>
            </div>
            <span className="badge badge-green">100% Deterministic</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Account Feed (Connected to Neon PostgreSQL) */}
      <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="heading-sm" style={{ margin: 0 }}>Recent Account Activity</h3>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: recentError ? 'var(--bg-subtle)' : '#E8F5E9',
              color: recentError ? 'var(--text-muted)' : '#2E7D32',
              fontWeight: '600'
            }}>
              <Database size={12} />
              {recentError ? 'Offline Fallback' : 'Neon DB (Top 5 Live)'}
            </span>
          </div>
          <button 
            onClick={fetchRecentTransactions}
            title="Refresh from Neon DB"
            className="btn btn-sm"
            style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--brand-blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}
          >
            <RefreshCw size={14} className={loadingRecent ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingRecent && displayRecent.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Fetching recent account activity from Neon PostgreSQL...
          </div>
        ) : displayRecent.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No recent account transactions found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayRecent.slice(0, 5).map((tx, idx) => {
              const txType = tx.type || tx.activity_type || 'expense';
              const isIncome = txType === 'income';
              const txDate = tx.date || tx.transaction_date;
              const txTime = tx.time || tx.transaction_time;
              const formattedAmount = typeof tx.amount === 'number'
                ? tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                : parseFloat(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

              return (
                <div
                  key={tx.id || tx.transaction_id || `tx-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: isIncome ? 'var(--safe-green-light)' : 'var(--bg-subtle)',
                      color: isIncome ? 'var(--safe-green)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '12px'
                    }}>
                      {isIncome ? '+' : '-'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {tx.category} • {txDate}{txTime ? ` ${txTime}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    fontSize: '15px',
                    fontWeight: '800',
                    color: isIncome ? 'var(--safe-green)' : 'var(--text-primary)'
                  }}>
                    {isIncome ? '+' : '-'} ₹ {formattedAmount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
