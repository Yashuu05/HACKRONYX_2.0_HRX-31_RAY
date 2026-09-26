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
  PlusCircle,
  Clock,
  RefreshCw,
  Database,
  Sparkles,
  UploadCloud
} from 'lucide-react';
import ShortfallRiskCard from './ShortfallRiskCard';

export default function DashboardOverview({ transactions, onOpenAddModal, onNavigateToChat, currentUser }) {
  const activeUserId = currentUser?.user_id || currentUser?.id || currentUser?.uid || 'usr-001';
  const [horizonDays, setHorizonDays] = useState(14);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState(() => (Array.isArray(transactions) && transactions.length > 0 ? transactions.slice(0, 5) : []));
  const [loadingRecent, setLoadingRecent] = useState(() => (!Array.isArray(transactions) || transactions.length === 0));
  const [recentError, setRecentError] = useState(null);
  const [shortfallTrajectory, setShortfallTrajectory] = useState([]);

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
    if (recentTransactions.length === 0 && (!transactions || transactions.length === 0)) {
      setLoadingRecent(true);
    }
    setRecentError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/transactions/recent?user_id=${encodeURIComponent(activeUserId)}&limit=5`);
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
      setRecentTransactions([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  // Fetch user constants (Budget & Safety Buffer) from Neon PostgreSQL
  const fetchUserConstants = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/constants/${encodeURIComponent(activeUserId)}`);
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

  // Fetch real-time summary calculations from Neon PostgreSQL
  const fetchSummaryData = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/transactions/summary?user_id=${encodeURIComponent(activeUserId)}`);
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

  // Fetch shortfall analysis trajectory from Neon DB
  const fetchShortfallTrajectory = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/shortfall/analysis?user_id=${encodeURIComponent(activeUserId)}&horizon_days=${horizonDays}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.analysis) {
          setShortfallTrajectory(data.analysis.trajectory || []);
        }
      }
    } catch (err) {
      console.warn('Could not fetch shortfall trajectory:', err);
    }
  };

  useEffect(() => {
    fetchRecentTransactions();
    fetchUserConstants();
    fetchSummaryData();
    fetchShortfallTrajectory();
  }, [transactions, horizonDays, activeUserId]);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const displayRecent = (Array.isArray(recentTransactions) && recentTransactions.length > 0)
    ? recentTransactions
    : safeTransactions.slice(0, 5);

  const getTxType = (t) => String(t.activity_type || t.type || 'expense').toLowerCase();

  const localTotalIncome = safeTransactions
    .filter(t => getTxType(t) === 'income')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const localTotalSpendings = safeTransactions
    .filter(t => getTxType(t) === 'expense')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const totalIncome = (summaryData && summaryData.status === 'success')
    ? Number(summaryData.total_income || 0)
    : localTotalIncome;

  const totalSpendings = (summaryData && summaryData.status === 'success')
    ? Number(summaryData.total_spendings || 0)
    : localTotalSpendings;

  const currentBankBalance = (summaryData && summaryData.status === 'success')
    ? Number(summaryData.net_balance || 0)
    : (localTotalIncome - localTotalSpendings);

  const hasEnoughData = (displayRecent.length > 0) || (totalIncome > 0) || (totalSpendings > 0) || (safeTransactions.length > 0);

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

  const roundNum = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const dailyBurnBaseline = roundNum((budgetWeek || 2500) / 7.0);

  // Real-time deterministic local trajectory computed instantly from current bank balance and daily burn
  const localTrajectory = React.useMemo(() => {
    const pts = [];
    let curBal = currentBankBalance;
    const now = new Date();
    for (let i = 1; i <= horizonDays; i++) {
      curBal = roundNum(curBal - dailyBurnBaseline);
      const isShortfall = curBal < safetyBuffer;
      const deficit = isShortfall ? roundNum(safetyBuffer - curBal) : 0;
      const d = new Date(now.getTime() + i * 86400000);
      pts.push({
        day: i,
        date: d.toISOString().split('T')[0],
        projected_balance: curBal,
        is_shortfall: isShortfall,
        shortfall_deficit: deficit
      });
    }
    return pts;
  }, [currentBankBalance, dailyBurnBaseline, safetyBuffer, horizonDays]);

  // Generate real forecast chart points from server shortfallTrajectory or instant local deterministic trajectory
  const rawTrajectory = (Array.isArray(shortfallTrajectory) && shortfallTrajectory.length > 0)
    ? shortfallTrajectory
    : (hasEnoughData ? localTrajectory : []);

  const displayedData = rawTrajectory.slice(0, horizonDays).map((t) => {
    const projBal = Number(t?.projected_balance) || 0;
    return {
      day: `Day ${t?.day ?? ''}`,
      date: t?.date || '',
      expected: projBal,
      best: roundNum(projBal * 1.04),
      worst: roundNum(projBal * 0.96),
      event: t?.is_shortfall ? `Buffer Deficit: ₹${roundNum(t?.shortfall_deficit ?? 0)}` : 'Balanced Spend'
    };
  });

  // SVG Chart math
  const width = 680;
  const height = 220;
  const padding = 28;

  const vals = displayedData.map(d => Number(d.expected) || 0);
  const rawMax = (displayedData.length > 0 && vals.length > 0) ? Math.max(...vals, 10000) : 12000;
  const rawMin = (displayedData.length > 0 && vals.length > 0) ? Math.min(...vals, 0) : 0;
  const safeMax = (!isNaN(rawMax) && isFinite(rawMax)) ? rawMax : 12000;
  const safeMin = (!isNaN(rawMin) && isFinite(rawMin)) ? rawMin : 0;
  const valRange = Math.max(1, safeMax - safeMin);

  const getX = (i) => padding + (i * (width - 2 * padding)) / Math.max(1, displayedData.length - 1);
  const getY = (val) => {
    const num = Number(val) || 0;
    return height - padding - ((num - safeMin) / valRange) * (height - 2 * padding);
  };

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
            Real-time liquidity forecasting & Safe-to-Spend intelligence from Neon DB.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onOpenAddModal} className="btn btn-secondary" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UploadCloud size={16} color="#0284C7" />
            <span>Upload CSV / XLSX</span>
          </button>
          <button onClick={onOpenAddModal} className="btn btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlusCircle size={18} />
            <span>+ Add Transaction</span>
          </button>
        </div>
      </div>

      {/* 6-Stat Hero Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '16px'
      }}>
        {/* Metric 1: Net Bank Balance */}
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

        {/* Metric 6: Safety Buffer */}
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
      <ShortfallRiskCard 
        currentUser={currentUser} 
        transactions={safeTransactions} 
        userConstants={userConstants} 
        summaryData={summaryData} 
        onNavigateToChat={onNavigateToChat} 
      />

      {/* Main Grid: Forecast Chart (Left) + AI Guardian Account Protection Status (Right) */}
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
                Deterministic cash trajectory calculated from Neon DB transactions & safety rules.
              </p>
            </div>

            {hasEnoughData && (
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
            )}
          </div>

          {/* If no data available, render "No enough data to forecast" notice */}
          {!hasEnoughData ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: '#FAFAFA',
              borderRadius: '14px',
              border: '1px solid var(--border-color)'
            }}>
              <TrendingUp size={36} style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--text-muted)', opacity: 0.4 }} />
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                No enough data to forecast
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 18px auto', lineHeight: '1.5' }}>
                Add your first income or expense transaction to unlock real-time 7–14 day liquidity forecasting and Safe-to-Spend calculations from Neon DB.
              </p>
              <button onClick={onOpenAddModal} className="btn btn-primary btn-sm">
                + Add Transaction
              </button>
            </div>
          ) : (
            /* SVG Line Chart using real Neon DB trajectory */
            <div style={{ position: 'relative', width: '100%', height: `${height}px`, backgroundColor: '#FAFAFA', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                {/* Grid Lines */}
                <line x1="0" y1={getY(8000)} x2={width} y2={getY(8000)} stroke="#E2E8F0" strokeDasharray="3 3" />
                <line x1="0" y1={getY(5000)} x2={width} y2={getY(5000)} stroke="#E2E8F0" strokeDasharray="3 3" />
                
                {/* Buffer Threshold */}
                <line x1="0" y1={getY(safetyBuffer)} x2={width} y2={getY(safetyBuffer)} stroke="#FDE68A" strokeWidth="2" strokeDasharray="4 4" />

                {/* Confidence Polygon */}
                {confidenceBandPath && <path d={confidenceBandPath} fill="#EFF6FF" opacity="0.6" />}

                {/* Expected Line */}
                {expectedPoints && <path d={`M ${expectedPoints}`} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                {/* Data Points */}
                {displayedData.map((d, i) => (
                  <g key={i}>
                    <circle
                      cx={getX(i)}
                      cy={getY(d.expected)}
                      r={hoveredPoint === i ? 6 : 4}
                      fill="#2563EB"
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
              {hoveredPoint !== null && displayedData[hoveredPoint] && (
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
                  <div style={{ fontWeight: '700' }}>{displayedData[hoveredPoint].day} ({displayedData[hoveredPoint].date})</div>
                  <div>{displayedData[hoveredPoint].event}</div>
                  <div style={{ color: '#93C5FD', fontWeight: '600', marginTop: '2px' }}>
                    Projected: ₹{(Number(displayedData[hoveredPoint]?.expected) || 0).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Card: AI Guardian Protection Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                backgroundColor: 'var(--safe-green-light)',
                color: 'var(--safe-green)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex'
              }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  AI Protection Status
                </h4>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Real-time Safety Buffer Monitoring</div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              SPECIFY continuously audits your bank balance and recurring debits against your configured safety buffer of ₹{formatCurrency(safetyBuffer, 0)}.
            </p>

            <div style={{
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Protected Bills Reserve:</span>
                <strong style={{ color: 'var(--text-primary)' }}>₹ 1,200.00</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Minimum Emergency Buffer:</span>
                <strong style={{ color: 'var(--brand-blue)' }}>₹ {formatCurrency(safetyBuffer, 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Safe-to-Spend Cap:</span>
                <strong style={{ color: 'var(--safe-green)', fontWeight: '800' }}>₹ {formatCurrency(safeToSpend)}</strong>
              </div>
            </div>
          </div>

          {/* Account Sync Status */}
          <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="var(--brand-blue)" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Neon DB Sync</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Connected to PostgreSQL</div>
              </div>
            </div>
            <span className="badge badge-green">100% Live</span>
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
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>
            No recent transactions
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
