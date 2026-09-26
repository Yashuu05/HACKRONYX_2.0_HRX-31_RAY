import React, { useState, useEffect } from 'react';
import { 
  PieChart, TrendingUp, TrendingDown, RefreshCw, AlertCircle, 
  Calendar, DollarSign, Wallet, ShieldCheck, Zap, CreditCard, ShoppingBag, Utensils
} from 'lucide-react';

// Helper to compute analytics client-side from real Neon DB transactions prop
function computeAnalyticsFromTxns(txns, timeframe, granularity) {
  if (!txns || txns.length === 0) {
    return {
      summary: {
        total_income: 0,
        total_expense: 0,
        net_saved: 0,
        spending_ratio: 0,
        savings_rate: 0,
        avg_daily_spend: 0
      },
      expense_categories: [],
      income_categories: [],
      timeseries: [],
      top_merchants: [],
      dow_pattern: [
        { day: 'Mon', amount: 0, count: 0 },
        { day: 'Tue', amount: 0, count: 0 },
        { day: 'Wed', amount: 0, count: 0 },
        { day: 'Thu', amount: 0, count: 0 },
        { day: 'Fri', amount: 0, count: 0 },
        { day: 'Sat', amount: 0, count: 0 },
        { day: 'Sun', amount: 0, count: 0 }
      ]
    };
  }

  const now = new Date();
  let cutoff = null;
  if (timeframe === '7d') cutoff = new Date(now.getTime() - 7 * 86400000);
  else if (timeframe === '30d') cutoff = new Date(now.getTime() - 30 * 86400000);
  else if (timeframe === '90d') cutoff = new Date(now.getTime() - 90 * 86400000);
  else if (timeframe === '180d') cutoff = new Date(now.getTime() - 180 * 86400000);

  const filtered = txns.filter(t => {
    if (!cutoff) return true;
    const d = new Date(t.transaction_date || t.date);
    return isNaN(d.getTime()) || d >= cutoff;
  });

  let total_income = 0;
  let total_expense = 0;
  const expenseMap = {};
  const incomeMap = {};
  const merchantMap = {};
  const dowMap = {
    'Mon': { amount: 0, count: 0 },
    'Tue': { amount: 0, count: 0 },
    'Wed': { amount: 0, count: 0 },
    'Thu': { amount: 0, count: 0 },
    'Fri': { amount: 0, count: 0 },
    'Sat': { amount: 0, count: 0 },
    'Sun': { amount: 0, count: 0 }
  };
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (const t of filtered) {
    const act = (t.activity_type || '').toLowerCase();
    const amt = Math.abs(parseFloat(t.amount) || 0);
    const cat = t.category || 'Other';
    const desc = t.description || cat;

    if (act === 'income') {
      total_income += amt;
      if (!incomeMap[cat]) incomeMap[cat] = { amount: 0, count: 0 };
      incomeMap[cat].amount += amt;
      incomeMap[cat].count += 1;
    } else {
      total_expense += amt;
      if (!expenseMap[cat]) expenseMap[cat] = { amount: 0, count: 0 };
      expenseMap[cat].amount += amt;
      expenseMap[cat].count += 1;

      if (!merchantMap[desc]) merchantMap[desc] = { name: desc, category: cat, amount: 0, count: 0 };
      merchantMap[desc].amount += amt;
      merchantMap[desc].count += 1;

      const d = new Date(t.transaction_date || t.date);
      if (!isNaN(d.getTime())) {
        const dowName = dowNames[d.getDay()];
        if (dowMap[dowName]) {
          dowMap[dowName].amount += amt;
          dowMap[dowName].count += 1;
        }
      }
    }
  }

  const net_saved = total_income - total_expense;
  const spending_ratio = total_income > 0 ? (total_expense / total_income) * 100 : 0;
  const savings_rate = total_income > 0 ? (net_saved / total_income) * 100 : 0;
  const days = timeframe === '7d' ? 7 : (timeframe === '30d' ? 30 : (timeframe === '90d' ? 90 : (timeframe === '180d' ? 180 : 30)));
  const avg_daily_spend = total_expense / days;

  const expense_categories = Object.entries(expenseMap).map(([category, val]) => ({
    category,
    amount: Math.round(val.amount * 100) / 100,
    count: val.count,
    percentage: total_expense > 0 ? Math.round((val.amount / total_expense) * 1000) / 10 : 0
  })).sort((a, b) => b.amount - a.amount);

  const income_categories = Object.entries(incomeMap).map(([category, val]) => ({
    category,
    amount: Math.round(val.amount * 100) / 100,
    count: val.count,
    percentage: total_income > 0 ? Math.round((val.amount / total_income) * 1000) / 10 : 0
  })).sort((a, b) => b.amount - a.amount);

  const top_merchants = Object.values(merchantMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const dow_order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dow_pattern = dow_order.map(day => ({
    day,
    amount: Math.round(dowMap[day].amount * 100) / 100,
    count: dowMap[day].count
  }));

  const timeseries = [
    {
      period: granularity === 'weekly' ? 'Current Period' : 'Month Total',
      income: Math.round(total_income * 100) / 100,
      expense: Math.round(total_expense * 100) / 100,
      net: Math.round(net_saved * 100) / 100
    }
  ];

  return {
    summary: {
      total_income: Math.round(total_income * 100) / 100,
      total_expense: Math.round(total_expense * 100) / 100,
      net_saved: Math.round(net_saved * 100) / 100,
      spending_ratio: Math.round(spending_ratio * 10) / 10,
      savings_rate: Math.round(savings_rate * 10) / 10,
      avg_daily_spend: Math.round(avg_daily_spend * 100) / 100
    },
    expense_categories,
    income_categories,
    timeseries,
    top_merchants,
    dow_pattern
  };
}

export default function AnalyticsView({ currentUser, transactions = [] }) {
  const userId = currentUser?.user_id || currentUser?.id || currentUser?.uid || 'usr-001';
  const [timeframe, setTimeframe] = useState('30d'); // '7d' | '30d' | '90d' | '180d' | 'all'
  const [granularity, setGranularity] = useState('weekly'); // 'weekly' | 'monthly'
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Compute instantaneous real-time analytics strictly from real transactions
  const clientComputed = React.useMemo(() => {
    return computeAnalyticsFromTxns(transactions, timeframe, granularity);
  }, [transactions, timeframe, granularity]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `http://localhost:8000/api/analytics?user_id=${userId}&timeframe=${timeframe}&granularity=${granularity}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server status ${response.status}`);
      }
      const data = await response.json();
      if (data.status === 'success') {
        setServerData(data);
      } else {
        throw new Error(data.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.warn('Analytics API fetch note: using client-computed real transaction metrics:', err);
      setError(null); // Non-blocking because real transaction data is already displayed
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch and re-compute whenever timeframe, granularity, user, or transactions change
  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, granularity, userId, transactions]);

  // Use server data if available, otherwise instantaneous clientComputed from real transactions
  const analyticsData = serverData || clientComputed;

  const summary = analyticsData?.summary || {
    total_income: 0, total_expense: 0, net_saved: 0, spending_ratio: 0, savings_rate: 0, avg_daily_spend: 0
  };
  const expenseCats = analyticsData?.expense_categories || [];
  const incomeCats = analyticsData?.income_categories || [];
  const timeseries = analyticsData?.timeseries || [];
  const topMerchants = analyticsData?.top_merchants || [];
  const dowPattern = analyticsData?.dow_pattern || [];

  // Helper colors
  const getCategoryColor = (cat, idx) => {
    const lower = cat.toLowerCase();
    if (lower.includes('food') || lower.includes('canteen')) return '#F59E0B'; // Amber
    if (lower.includes('mess') || lower.includes('hostel') || lower.includes('rent')) return '#3B82F6'; // Blue
    if (lower.includes('subscription') || lower.includes('media')) return '#8B5CF6'; // Purple
    if (lower.includes('upi') || lower.includes('shopping')) return '#EC4899'; // Pink
    if (lower.includes('salary') || lower.includes('stipend') || lower.includes('family')) return '#10B981'; // Green
    const palette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];
    return palette[idx % palette.length];
  };

  const getRatioBadge = (ratio) => {
    if (ratio <= 70) {
      return { text: 'Healthy (< 70%)', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
    } else if (ratio <= 90) {
      return { text: 'Caution (70-90%)', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
    } else {
      return { text: 'High Risk (> 90%)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
    }
  };

  const ratioBadge = getRatioBadge(summary.spending_ratio);

  // Maximum value for timeseries bar chart scaling
  const maxTsAmount = Math.max(...timeseries.map(t => Math.max(t.income, t.expense)), 1000);
  const maxDowAmount = Math.max(...dowPattern.map(d => d.amount), 500);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Title Header & Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 className="heading-lg" style={{ fontSize: '28px', margin: 0 }}>
              Cash-Flow Analytics & Insights
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 10px',
              borderRadius: '20px',
              backgroundColor: '#EFF6FF',
              color: 'var(--brand-blue)',
              border: '1px solid #BFDBFE'
            }}>
              Neon DB Live
            </span>
          </div>
          <p className="body-sm" style={{ color: 'var(--text-secondary)' }}>
            Real-time pattern discovery for income, categorized spending, and cashflow velocity.
          </p>
        </div>

        {/* Filters bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Timeframe Selector */}
          <div style={{
            display: 'flex',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '3px'
          }}>
            {[
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
              { id: '180d', label: '6 Months' },
              { id: 'all', label: 'All Time' }
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                style={{
                  border: 'none',
                  background: timeframe === tf.id ? 'var(--brand-blue)' : 'transparent',
                  color: timeframe === tf.id ? '#FFFFFF' : 'var(--text-secondary)',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Granularity Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '3px'
          }}>
            {[
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' }
            ].map((gr) => (
              <button
                key={gr.id}
                onClick={() => setGranularity(gr.id)}
                style={{
                  border: 'none',
                  background: granularity === gr.id ? 'var(--text-primary)' : 'transparent',
                  color: granularity === gr.id ? '#FFFFFF' : 'var(--text-secondary)',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {gr.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            title="Refresh Analytics"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        {/* Card 1: Total Income */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Income</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
            ₹ {summary.total_income.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Across selected period
          </div>
        </div>

        {/* Card 2: Total Spendings */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Spendings</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
            ₹ {summary.total_expense.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Avg ₹ {summary.avg_daily_spend.toLocaleString()} / day
          </div>
        </div>

        {/* Card 3: Net Saved */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Net Savings</span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: summary.net_saved >= 0 ? '#EFF6FF' : '#FEF2F2',
              color: summary.net_saved >= 0 ? 'var(--brand-blue)' : '#EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wallet size={20} />
            </div>
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '800',
            color: summary.net_saved >= 0 ? '#10B981' : '#EF4444',
            marginBottom: '4px'
          }}>
            {summary.net_saved >= 0 ? '+' : ''} ₹ {summary.net_saved.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Savings Rate: <strong style={{ color: summary.savings_rate >= 0 ? '#10B981' : '#EF4444' }}>{summary.savings_rate}%</strong>
          </div>
        </div>

        {/* Card 4: Spend-to-Income Ratio */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Spending / Income Ratio</span>
            <div style={{
              padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
              backgroundColor: ratioBadge.bg, color: ratioBadge.color
            }}>
              {ratioBadge.text}
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {summary.spending_ratio}%
          </div>
          {/* Progress bar ratio */}
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, summary.spending_ratio)}%`,
              height: '100%',
              backgroundColor: ratioBadge.color,
              borderRadius: '3px'
            }} />
          </div>
        </div>
      </div>

      {/* Main Chart: Time Series (Income vs Expense Trend) */}
      <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 className="heading-sm" style={{ marginBottom: '4px' }}>
              {granularity === 'weekly' ? 'Weekly' : 'Monthly'} Cash-Flow Velocity Trend
            </h3>
            <p className="body-sm" style={{ color: 'var(--text-muted)' }}>
              Periodic breakdown of Income credits vs Expense debits
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: '600' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10B981' }} />
              <span>Income</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#EF4444' }} />
              <span>Expense</span>
            </div>
          </div>
        </div>

        {timeseries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No transaction records found for the selected timeframe.
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '16px',
            height: '220px',
            paddingTop: '20px',
            borderBottom: '1px dashed var(--border-color)',
            overflowX: 'auto'
          }}>
            {timeseries.map((item, idx) => {
              const incHeight = Math.round((item.income / maxTsAmount) * 180);
              const expHeight = Math.round((item.expense / maxTsAmount) * 180);

              return (
                <div key={idx} style={{
                  flex: 1,
                  minWidth: '60px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end'
                }}>
                  {/* Bars Container */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', width: '100%', justifyContent: 'center' }}>
                    {/* Income Bar */}
                    <div
                      title={`Income: ₹ ${item.income.toLocaleString()}`}
                      style={{
                        width: '18px',
                        height: `${Math.max(4, incHeight)}px`,
                        backgroundColor: '#10B981',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease'
                      }}
                    />
                    {/* Expense Bar */}
                    <div
                      title={`Expense: ₹ ${item.expense.toLocaleString()}`}
                      style={{
                        width: '18px',
                        height: `${Math.max(4, expHeight)}px`,
                        backgroundColor: '#EF4444',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease'
                      }}
                    />
                  </div>
                  {/* Label */}
                  <div style={{ marginTop: '10px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {item.period.length > 7 ? item.period.substring(5) : item.period}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Row 2: Categorized Spend Breakdown & Income Source Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        {/* Categorized Spend Breakdown */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="heading-sm">Categorized Spend Breakdown</h3>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
              {expenseCats.length} Categories
            </span>
          </div>

          {expenseCats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No expense data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {expenseCats.map((cat, idx) => {
                const color = getCategoryColor(cat.category, idx);
                return (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                        {cat.category}
                      </span>
                      <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>
                        ₹ {cat.amount.toLocaleString()} ({cat.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${cat.percentage}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Income Source Breakdown */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="heading-sm">Income Stream Breakdown</h3>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
              {incomeCats.length} Sources
            </span>
          </div>

          {incomeCats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No income records</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {incomeCats.map((cat, idx) => {
                const color = '#10B981';
                return (
                  <div key={cat.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                        {cat.category}
                      </span>
                      <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>
                        ₹ {cat.amount.toLocaleString()} ({cat.percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${cat.percentage}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Grid Row 3: Top Spender Merchants & Day of Week Pattern */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        {/* Top Spender Merchants */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px' }}>
          <h3 className="heading-sm" style={{ marginBottom: '20px' }}>Top Spender Merchants / Payees</h3>

          {topMerchants.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No merchants found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topMerchants.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {m.category} • {m.count} txns
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    ₹ {m.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Day of Week Pattern */}
        <div className="card" style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px' }}>
          <h3 className="heading-sm" style={{ marginBottom: '6px' }}>Day-of-Week Spending Heatmap</h3>
          <p className="body-sm" style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
            Uncover spending distribution across weekdays vs weekends
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '140px', paddingTop: '10px' }}>
            {dowPattern.map((d) => {
              const barH = Math.round((d.amount / maxDowAmount) * 100);
              return (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div
                    title={`${d.day}: ₹ ${d.amount.toLocaleString()}`}
                    style={{
                      width: '100%',
                      maxWidth: '28px',
                      height: `${Math.max(4, barH)}px`,
                      backgroundColor: (d.day === 'Sat' || d.day === 'Sun') ? '#F59E0B' : 'var(--brand-blue)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease'
                    }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    {d.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

