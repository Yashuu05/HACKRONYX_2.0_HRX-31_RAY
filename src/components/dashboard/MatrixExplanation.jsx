import React, { useState } from 'react';
import {
  Calculator, Shield, Clock, Flame,
  AlertTriangle, DollarSign, ChevronDown, ChevronUp,
  BookOpen, Target, BarChart3, PieChart
} from 'lucide-react';

const categories = [
  'Core Financial Metrics',
  'Spending Analysis',
  'Forecasting Engine',
  'Risk Intelligence',
  'Analytics Engine'
];

const formulaData = [
  {
    id: 'net-balance',
    icon: DollarSign,
    category: 'Core Financial Metrics',
    title: 'Net Balance (B_t)',
    subtitle: 'Your Real Current Financial Position',
    formula: 'B_t = Total_Income − Total_Expenses',
    formulaTerms: [
      { term: 'B_t', meaning: 'Net Balance at current time "t" — your actual money available right now' },
      { term: 'Total_Income', meaning: 'Sum of ALL money received — stipends, salary, pocket money, freelance, etc.' },
      { term: 'Total_Expenses', meaning: 'Sum of ALL money spent — food, rent, travel, subscriptions, shopping, etc.' },
    ],
    howItWorks: 'Every time you add a transaction, the system fetches ALL your income records from the database and sums them up, then subtracts ALL your expense records. The result is your true net balance — not an estimate, but the mathematically exact amount calculated from your actual data in real-time.',
    example: 'Stipend Rs.15,000 + Freelance Rs.2,000 = Rs.17,000 income. Total spent = Rs.8,400 → Net Balance = Rs.17,000 − Rs.8,400 = Rs.8,600',
    whyItMatters: 'This is the foundation of everything. Every other calculation — Safe to Spend, Risk Score, Days to Shortfall — starts from this number. An accurate net balance = accurate predictions.',
    badge: 'Foundation',
    subFormulas: null,
  },
  {
    id: 'safe-to-spend',
    icon: Shield,
    category: 'Core Financial Metrics',
    title: 'Safe-to-Spend Daily Ceiling',
    subtitle: 'The Maximum You Can Spend Per Day Without Risk',
    formula: 'Safe_Ceiling = (B_t − S_buffer) ÷ Days_to_Shortfall',
    formulaTerms: [
      { term: 'B_t', meaning: 'Your current Net Balance (Total Income − Total Expenses)' },
      { term: 'S_buffer', meaning: 'Safety Buffer — the minimum amount you MUST always keep in reserve (e.g. Rs.3,000)' },
      { term: 'Days_to_Shortfall', meaning: 'Number of days until your balance is predicted to fall below the safety buffer' },
    ],
    howItWorks: 'The system first calculates how much money you have ABOVE your safety buffer (called the "safe surplus"). Then it spreads that surplus evenly across the days until shortfall. The result is the daily maximum you can spend without touching your emergency reserve.',
    example: 'Net Balance = Rs.8,600 | Safety Buffer = Rs.3,000 | Days to Shortfall = 11 → Safe Surplus = Rs.5,600 → Safe Ceiling = Rs.5,600 ÷ 11 = Rs.509/day',
    whyItMatters: 'Prevents "feel-rich" overspending. Many people see a high balance and spend freely, not realizing big bills are coming. This formula gives you a concrete daily limit that guarantees you never dip below your emergency reserve.',
    badge: 'Key Metric',
    subFormulas: null,
  },
  {
    id: 'daily-burn',
    icon: Flame,
    category: 'Spending Analysis',
    title: 'Daily Burn Baseline (Discretionary)',
    subtitle: 'Your Real Average Daily Spending Velocity',
    formula: 'Daily_Burn = Discretionary_Expenses_30d ÷ 30',
    formulaTerms: [
      { term: 'Discretionary_Expenses_30d', meaning: 'Total of all non-fixed expenses in the last 30 days. Excludes: Rent, Mess & Hostel, Tuition, Hostel Fee, Laptop Repair — these are unavoidable fixed costs' },
      { term: '30', meaning: 'The 30-day rolling baseline window for calculating your average spending velocity' },
    ],
    howItWorks: 'The system filters your transactions and removes "protected" fixed obligations like Rent, Mess & Hostel, Tuition. These are excluded because they are unavoidable. The remaining discretionary spending (food, transport, shopping, entertainment) is summed over 30 days and divided by 30.',
    example: 'In 30 days: Food Rs.4,500 + Transport Rs.1,200 + Shopping Rs.2,100 + Entertainment Rs.900 = Rs.8,700 → Daily Burn = Rs.8,700 ÷ 30 = Rs.290/day',
    whyItMatters: 'This is your "spending DNA" — how much you naturally spend when not watching. The system uses this to project your future balance day-by-day. If Daily Burn > Safe Ceiling, alerts fire.',
    badge: 'Velocity Engine',
    subFormulas: null,
  },
  {
    id: 'budget-burn',
    icon: Target,
    category: 'Spending Analysis',
    title: 'Budget Burn Baseline',
    subtitle: 'The Theoretical Daily Spend Derived from Your Weekly Budget',
    formula: 'Budget_Burn = W_budget ÷ 7',
    formulaTerms: [
      { term: 'W_budget', meaning: 'Your configured Weekly Budget (set by you in Settings, e.g. Rs.5,000/week)' },
      { term: '7', meaning: 'Days in a week — normalizes the budget to a per-day rate' },
    ],
    howItWorks: 'When you set a weekly budget in Settings, the system automatically divides it by 7. This is used in trajectory forecasting on days when no specific scheduled transaction exists — the system assumes you will spend at least this much per day.',
    example: 'Weekly Budget = Rs.5,000 → Budget Burn = Rs.5,000 ÷ 7 = Rs.714.29/day',
    whyItMatters: 'Acts as a fallback minimum expected spend for future days with no scheduled transactions. Without this, projections would assume Rs.0 spending on some days, making forecasts dangerously optimistic.',
    badge: 'Budget Tool',
    subFormulas: null,
  },
  {
    id: 'trajectory',
    icon: BarChart3,
    category: 'Forecasting Engine',
    title: '7–14 Day Balance Trajectory',
    subtitle: 'Day-by-Day Future Balance Projection',
    formula: 'B(t) = B(t-1) + Scheduled_Income(t) − Scheduled_Expense(t) − Daily_Burn',
    formulaTerms: [
      { term: 'B(t)', meaning: 'Projected balance on day t (each future day from 1 to 14)' },
      { term: 'B(t-1)', meaning: "Balance from the previous day — starts from B_t (today's net balance)" },
      { term: 'Scheduled_Income(t)', meaning: 'Any confirmed future income transactions already recorded for that specific day' },
      { term: 'Scheduled_Expense(t)', meaning: 'Any confirmed future expense transactions already recorded for that specific day' },
      { term: 'Daily_Burn', meaning: 'Applied only if NO scheduled expense exists for that day — your discretionary burn rate fallback' },
    ],
    howItWorks: 'Starting from your current net balance, the system simulates each future day one by one. For each day: (1) Are there scheduled income payments? Add them. (2) Are there scheduled expenses? Subtract them. (3) If no scheduled expense, subtract daily burn. Repeat for all 14 days.',
    example: 'Day 0: Rs.8,600 | Day 1: No events → Rs.8,600 − Rs.290 = Rs.8,310 | Day 5: Rent Rs.4,500 → previous − Rs.290 − Rs.4,500 | Day 8: Stipend Rs.8,000 arrives → previous + Rs.8,000',
    whyItMatters: 'Instead of just looking at today, this shows the financial movie of the next 14 days — exactly when balance dips, where danger zones are, and when income relief is coming.',
    badge: 'Forecasting Core',
    subFormulas: null,
  },
  {
    id: 'shortfall-risk',
    icon: AlertTriangle,
    category: 'Risk Intelligence',
    title: 'Shortfall Risk Score (R_shortfall)',
    subtitle: 'A 0–100 Score Quantifying Your Financial Risk Right Now',
    formula: 'R_shortfall = min(100, max(15, Depth_Score + Urgency_Score))',
    formulaTerms: [
      { term: 'Max_Deficit', meaning: 'Maximum amount by which projected balance falls below safety buffer across 14 days' },
      { term: 'S_buffer', meaning: 'Your configured Safety Buffer (e.g. Rs.3,000)' },
      { term: 'Days_to_Shortfall', meaning: 'How many days until balance first crosses below the safety buffer' },
      { term: 'min(100, max(15, ...))', meaning: 'Score clamped: minimum 15 when any shortfall exists, maximum 100. Score 0 = completely SAFE' },
    ],
    howItWorks: 'The score has two parts: DEPTH (how bad is it?) + URGENCY (how soon?). Each contributes up to 50 points. Added together and clamped to 0–100. Score 0 = SAFE (no shortfall). 15–59 = MODERATE. 60–100 = CRITICAL.',
    example: 'Max Deficit Rs.800, Buffer Rs.3,000, Days to Shortfall = 5 → Depth = (800/3001)*50 = 13.3 pts | Urgency = (15-5)*3.5 = 35 pts → Total = 48.3 → MODERATE risk',
    whyItMatters: 'One number from 0–100 instantly communicates financial health. Clear, predictable risk score without guesswork.',
    badge: 'Risk Engine',
    subFormulas: [
      { label: 'Depth Score (max 50 points)', formula: 'Depth_Score = (Max_Deficit / (S_buffer + 1)) * 50', explanation: 'Measures HOW BAD the shortfall is — how deeply below the safety buffer balance falls' },
      { label: 'Urgency Score (max 50 points)', formula: 'Urgency_Score = max(0, (15 - Days_to_Shortfall)) * 3.5', explanation: 'Measures HOW SOON the shortfall arrives — closer = higher urgency score' },
    ],
  },
  {
    id: 'days-to-shortfall',
    icon: Clock,
    category: 'Risk Intelligence',
    title: 'Days to Shortfall',
    subtitle: 'Exact Countdown Until Financial Buffer is Breached',
    formula: 'First day t where B(t) < S_buffer',
    formulaTerms: [
      { term: 't (day index)', meaning: 'Each future day from 1 to 14 in the projection loop' },
      { term: 'B(t)', meaning: 'Projected balance on that future day (from the trajectory engine)' },
      { term: 'S_buffer', meaning: 'Your Safety Buffer — the red line that must not be crossed' },
    ],
    howItWorks: 'The system runs through each day in the 14-day trajectory. The moment it finds the FIRST day where the projected balance drops below your safety buffer, it records that day number. If current balance is already below buffer, Days to Shortfall = 0.',
    example: 'Day 1: Rs.8,310 OK | Day 2: Rs.8,020 OK | Day 3: Rent → Rs.3,230 OK | Day 4: Rs.2,940 < Rs.3,000 SHORTFALL → Days to Shortfall = 4',
    whyItMatters: 'Time is the most critical dimension of risk. Shortfall in 1 day = emergency action needed now. Shortfall in 12 days = planning window.',
    badge: 'Time Alert',
    subFormulas: null,
  },
  {
    id: 'spending-ratio',
    icon: PieChart,
    category: 'Analytics Engine',
    title: 'Spending Ratio & Savings Rate',
    subtitle: 'What % of Your Income Goes to Spending vs Saving',
    formula: 'Spending_Ratio = (Total_Expense / Total_Income) * 100',
    formulaTerms: [
      { term: 'Total_Expense', meaning: 'Sum of all expense transactions within the selected timeframe (7d, 30d, 90d, etc.)' },
      { term: 'Total_Income', meaning: 'Sum of all income transactions within the selected timeframe' },
      { term: 'Savings_Rate', meaning: 'Savings_Rate = 100 − Spending_Ratio' },
    ],
    howItWorks: 'Calculates the proportion of incoming money consumed by expenses. If Total Income is 0, Spending Ratio defaults to 100% (if expenses exist) or 0% (if no expenses). Savings Rate is simply the inverse percentage.',
    example: 'Income Rs.17,000 | Expenses Rs.8,400 → Spending Ratio = (8,400 / 17,000) * 100 = 49.4% → Savings Rate = 50.6%',
    whyItMatters: 'Identifies whether you are living within your means over time. A spending ratio above 90% indicates elevated vulnerability to surprise expenses.',
    badge: 'Financial Health',
    subFormulas: null,
  }
];

function FormulaCard({ formula }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = formula.icon;

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      border: '1px solid #E2E8F0',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      {/* Card Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '20px 24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid #BFDBFE',
          }}>
            <Icon size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {formula.category}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                border: '1px solid #BFDBFE',
              }}>
                {formula.badge}
              </span>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
              {formula.title}
            </h3>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
              {formula.subtitle}
            </div>
          </div>
        </div>
        <button
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563EB',
            cursor: 'pointer',
          }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Formula Code Box */}
      <div style={{ padding: '0 24px 20px 24px' }}>
        <div style={{
          backgroundColor: '#EFF6FF',
          borderLeft: '4px solid #2563EB',
          borderRadius: '0 10px 10px 0',
          padding: '12px 16px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '14px',
          fontWeight: '700',
          color: '#1E40AF',
        }}>
          {formula.formula}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{
          padding: '20px 24px 24px 24px',
          borderTop: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}>
          {/* Terms */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={14} color="#2563EB" />
              <span>Formula Variables</span>
            </div>
            {formula.formulaTerms.map((t, i) => (
              <div key={i} style={{
                display: 'flex', gap: '12px', padding: '10px 14px', marginBottom: '6px',
                backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', alignItems: 'center',
              }}>
                <code style={{
                  fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: '700',
                  color: '#2563EB', backgroundColor: '#EFF6FF', padding: '32px 8px', py: '2px',
                  borderRadius: '6px', border: '1px solid #BFDBFE', whiteSpace: 'nowrap', flexShrink: 0,
                }}>{t.term}</code>
                <span style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{t.meaning}</span>
              </div>
            ))}
          </div>

          {/* Subformulas if any */}
          {formula.subFormulas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Component Sub-Formulas
              </div>
              {formula.subFormulas.map((sub, idx) => (
                <div key={idx} style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>{sub.label}</div>
                  <code style={{ fontSize: '12px', color: '#2563EB', fontWeight: '700', display: 'block', margin: '4px 0' }}>{sub.formula}</code>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{sub.explanation}</div>
                </div>
              ))}
            </div>
          )}

          {/* How it works */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Logic & Mechanics
            </div>
            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', margin: 0 }}>
              {formula.howItWorks}
            </p>
          </div>

          {/* Example */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Numerical Demonstration
            </div>
            <div style={{
              fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#0F172A',
              backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px',
              padding: '12px 16px', lineHeight: '1.7',
            }}>
              {formula.example}
            </div>
          </div>

          {/* Why it matters */}
          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#2563EB', marginBottom: '4px' }}>
              Why This Metric Matters
            </div>
            <p style={{ fontSize: '13px', color: '#1E3A8A', lineHeight: '1.6', margin: 0 }}>
              {formula.whyItMatters}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatrixExplanation() {
  const [activeCategory, setActiveCategory] = useState('All');
  const allCategories = ['All', ...categories];
  const filtered = activeCategory === 'All' ? formulaData : formulaData.filter(f => f.category === activeCategory);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Header Banner */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '36px 0 28px 0',
      }}>
        <div style={{ maxWidth: '880px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: '#EFF6FF', color: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #BFDBFE',
            }}>
              <Calculator size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Financial Formula Reference
              </h1>
              <p style={{ fontSize: '14px', color: '#475569', margin: '2px 0 0 0' }}>
                100% Rule-Based & Mathematically Deterministic Cashflow Intelligence
              </p>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', maxWidth: '720px', marginBottom: '20px' }}>
            Cashflow Guardian uses clean statistical rules applied directly to your database records.
            No black-box models or speculative AI predictions own your balances.
          </p>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
            {[
              { label: 'Total Formulas', value: String(formulaData.length) },
              { label: 'Categories', value: String(categories.length) },
              { label: 'AI Speculation', value: '0%' },
              { label: 'Execution Speed', value: '< 15ms' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563EB' }}>{s.value}</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Category Filter */}
      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '880px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 0' }}>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: activeCategory === cat ? '#2563EB' : '#E2E8F0',
                  backgroundColor: activeCategory === cat ? '#2563EB' : '#FFFFFF',
                  color: activeCategory === cat ? '#FFFFFF' : '#475569',
                  fontWeight: activeCategory === cat ? '700' : '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Formula List */}
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '24px 24px 60px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(f => <FormulaCard key={f.id} formula={f} />)}
        </div>

        {/* System Guarantee Card */}
        <div style={{
          marginTop: '32px',
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #BFDBFE',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
        }}>
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px 0' }}>
            Guaranteed Mathematical Precision
          </h3>
          <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
            Every balance, safe-to-spend limit, and trajectory projection displayed on your dashboard is calculated dynamically in SQL / Python using the exact equations above.
            You can verify every calculation against your own transaction records at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
