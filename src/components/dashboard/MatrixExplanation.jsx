import React, { useState } from 'react';
import {
  Calculator, TrendingDown, Shield, Clock, Flame,
  AlertTriangle, DollarSign, Brain, ChevronDown, ChevronUp,
  BookOpen, Zap, Target, BarChart3, Activity, PieChart
} from 'lucide-react';

const formulaData = [
  {
    id: 'net-balance',
    icon: DollarSign,
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
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
    badgeColor: '#2563EB',
    subFormulas: null,
  },
  {
    id: 'safe-to-spend',
    icon: Shield,
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
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
    badgeColor: '#059669',
    subFormulas: null,
  },
  {
    id: 'daily-burn',
    icon: Flame,
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FED7AA',
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
    badgeColor: '#EA580C',
    subFormulas: null,
  },
  {
    id: 'budget-burn',
    icon: Target,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
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
    badgeColor: '#7C3AED',
    subFormulas: null,
  },
  {
    id: 'trajectory',
    icon: BarChart3,
    color: '#0891B2',
    bgColor: '#ECFEFF',
    borderColor: '#A5F3FC',
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
    example: 'Day 0: Rs.8,600 | Day 1: No events → Rs.8,600 − Rs.290 = Rs.8,310 | Day 5: Rent Rs.4,500 → previous − Rs.290 − Rs.4,500 | Day 8: Stipend Rs.8,000 arrives → previous + Rs.8,000 − Rs.290',
    whyItMatters: 'Instead of just looking at today, this shows the financial movie of the next 14 days — exactly when balance dips, where danger zones are, and when income relief is coming.',
    badge: 'Forecasting Core',
    badgeColor: '#0891B2',
    subFormulas: null,
  },
  {
    id: 'shortfall-risk',
    icon: AlertTriangle,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
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
    whyItMatters: 'One number from 0–100 instantly communicates financial health. Green = safe. Amber = caution. Red = act now. No reading through tables of data needed.',
    badge: 'Risk Engine',
    badgeColor: '#DC2626',
    subFormulas: [
      { label: 'Depth Score (max 50 points)', formula: 'Depth_Score = (Max_Deficit / (S_buffer + 1)) * 50', explanation: 'Measures HOW BAD the shortfall is — how deeply below the safety buffer balance falls' },
      { label: 'Urgency Score (max 50 points)', formula: 'Urgency_Score = max(0, (15 - Days_to_Shortfall)) * 3.5', explanation: 'Measures HOW SOON the shortfall arrives — closer = higher urgency score' },
    ],
  },
  {
    id: 'days-to-shortfall',
    icon: Clock,
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    category: 'Risk Intelligence',
    title: 'Days to Shortfall',
    subtitle: 'Exact Countdown Until Financial Buffer is Breached',
    formula: 'First day t where B(t) < S_buffer',
    formulaTerms: [
      { term: 't (day index)', meaning: 'Each future day from 1 to 14 in the projection loop' },
      { term: 'B(t)', meaning: 'Projected balance on that future day (from the trajectory engine)' },
      { term: 'S_buffer', meaning: 'Your Safety Buffer — the red line that must not be crossed' },
    ],
    howItWorks: 'The system runs through each day in the 14-day trajectory. The moment it finds the FIRST day where the projected balance drops below your safety buffer, it records that day number. If current balance is already below buffer, Days to Shortfall = 0. If no day in 14 days breaches the buffer, result = null (safe).',
    example: 'Day 1: Rs.8,310 OK | Day 2: Rs.8,020 OK | Day 3: Rent → Rs.3,230 OK | Day 4: Rs.2,940 < Rs.3,000 SHORTFALL → Days to Shortfall = 4',
    whyItMatters: 'Time is the most critical dimension of risk. Shortfall in 1 day = emergency action needed now. Shortfall in 12 days = planning window. This countdown creates urgency proportional to the real threat.',
    badge: 'Time Alert',
    badgeColor: '#D97706',
    subFormulas: null,
  },
  {
    id: 'max-deficit',
    icon: TrendingDown,
    color: '#9333EA',
    bgColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    category: 'Risk Intelligence',
    title: 'Maximum Deficit Below Buffer',
    subtitle: 'The Deepest Point Your Balance Falls Below the Safety Reserve',
    formula: 'Delta = max over all shortfall days of (S_buffer − B(t))',
    formulaTerms: [
      { term: 'S_buffer', meaning: 'Your configured Safety Buffer amount' },
      { term: 'B(t)', meaning: 'Projected balance on a specific future day when shortfall occurs' },
      { term: 'max(...)', meaning: 'The system tracks every shortfall day and picks the WORST one — the deepest deficit in the 14-day window' },
    ],
    howItWorks: 'During the 14-day simulation, every time a projected balance goes below the safety buffer, the system calculates the deficit (Buffer − Balance). It continuously updates and tracks the maximum (deepest) deficit seen across all shortfall days.',
    example: 'Day 4: Balance Rs.2,940 → Deficit Rs.60 | Day 5: Rs.2,650 → Deficit Rs.350 | Day 6: Rs.2,400 → Deficit Rs.600 → Max Deficit = Rs.600',
    whyItMatters: 'Shows the SCALE of the problem. Rs.50 deficit = tiny adjustment. Rs.4,000 deficit = serious action required. This directly drives the mitigation strategy amounts.',
    badge: 'Depth Measure',
    badgeColor: '#9333EA',
    subFormulas: null,
  },
  {
    id: 'spending-ratio',
    icon: PieChart,
    color: '#0F766E',
    bgColor: '#F0FDFA',
    borderColor: '#99F6E4',
    category: 'Analytics Engine',
    title: 'Spending Ratio & Savings Rate',
    subtitle: 'What % of Your Income Goes to Spending vs Saving',
    formula: 'Spending_Ratio = (Total_Expense / Total_Income) * 100',
    formulaTerms: [
      { term: 'Total_Expense', meaning: 'Sum of all expense transactions within the selected timeframe (7d, 30d, 90d, etc.)' },
      { term: 'Total_Income', meaning: 'Sum of all income transactions within the selected timeframe' },
      { term: '* 100', meaning: 'Converts the ratio to a percentage for easy reading' },
    ],
    howItWorks: 'The analytics engine fetches all transactions within your selected timeframe. It separates income and expense records, sums each group, and computes the ratio. An 80% spending ratio means 80 paise of every rupee you earn goes to spending.',
    example: 'Income Rs.15,000 | Expenses Rs.11,500 → Spending Ratio = (11,500/15,000)*100 = 76.7% | Net Saved = Rs.3,500 | Savings Rate = 23.3%',
    whyItMatters: 'Financial health benchmark: Savings Rate < 10% = danger zone. 10-20% = moderate. 20%+ = healthy. Instantly shows whether you are living within your means.',
    badge: 'Analytics',
    badgeColor: '#0F766E',
    subFormulas: [
      { label: 'Savings Rate', formula: 'Savings_Rate = (Net_Saved / Total_Income) * 100', explanation: 'Percentage of income that you are actually retaining / saving' },
      { label: 'Net Saved', formula: 'Net_Saved = Total_Income − Total_Expense', explanation: 'Absolute rupees retained after all spending in the selected period' },
    ],
  },
  {
    id: 'avg-daily-spend',
    icon: Activity,
    color: '#1D4ED8',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    category: 'Analytics Engine',
    title: 'Average Daily Spend',
    subtitle: 'Historical Average of How Much You Spend Per Day',
    formula: 'Avg_Daily_Spend = Total_Expense_in_Period / Days_in_Period',
    formulaTerms: [
      { term: 'Total_Expense_in_Period', meaning: 'Sum of ALL expense transactions in the selected timeframe (includes fixed costs like rent, unlike Daily Burn)' },
      { term: 'Days_in_Period', meaning: 'Number of calendar days in the selected timeframe (e.g. 30 for Last 30 Days)' },
    ],
    howItWorks: 'Takes total spending within the selected timeframe and divides by number of days. This INCLUDES fixed costs like rent, unlike Discretionary Daily Burn which excludes them. Use this as your total cost of living per day metric.',
    example: 'Last 30 days: Total spent Rs.18,900 (including Rs.7,000 rent) → Avg Daily Spend = Rs.18,900 / 30 = Rs.630/day',
    whyItMatters: 'Helps compare actual historical spending against the daily safe ceiling. If Avg Daily Spend consistently exceeds Safe Ceiling, there is a structural budget problem.',
    badge: 'Historical Avg',
    badgeColor: '#1D4ED8',
    subFormulas: null,
  },
  {
    id: 'safe-surplus-clamp',
    icon: Zap,
    color: '#047857',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    category: 'Mitigation Engine',
    title: 'Safe-to-Spend Clamp',
    subtitle: 'Precisely Calculated Daily Budget Cap to Prevent Shortfall',
    formula: 'Clamped_Limit = max(0, B_t − S_buffer) / Days_to_Shortfall',
    formulaTerms: [
      { term: 'max(0, B_t − S_buffer)', meaning: 'Safe Surplus — money available above the safety buffer. Floored at Rs.0 (cannot go negative)' },
      { term: 'Clamped_Limit', meaning: 'Your emergency daily spending cap — the maximum you can spend per day to stay above the buffer' },
      { term: 'Daily_Reduction', meaning: 'How much you need to cut per day from your current burn rate (Burn − Clamped_Limit)' },
    ],
    howItWorks: 'When a shortfall is detected, the system calculates your surplus above the buffer, spreads it evenly across remaining days until shortfall. This is your emergency daily cap. Spending above this cap breaches the buffer.',
    example: 'Balance Rs.8,600 | Buffer Rs.3,000 | Days 11 | Burn Rs.290/day → Surplus Rs.5,600 → Limit Rs.509/day | Reduction = Rs.0 (already under limit)',
    whyItMatters: 'Gives a precise actionable number: Spend no more than Rs.X per day. Not a vague spend less warning — an exact mathematical threshold from your real data.',
    badge: 'Action Formula',
    badgeColor: '#047857',
    subFormulas: [
      { label: 'Daily Reduction Needed', formula: 'Daily_Reduction = max(0, Daily_Burn - Clamped_Limit)', explanation: 'Exactly how much you need to cut from current daily spending to avoid shortfall' },
      { label: 'Total Savings Impact', formula: 'Total_Impact = Daily_Reduction * Days_to_Shortfall', explanation: 'Total rupees saved over the shortfall window if you follow the clamped limit' },
    ],
  },
  {
    id: 'buffer-drawdown',
    icon: Brain,
    color: '#B45309',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    category: 'Mitigation Engine',
    title: 'Emergency Buffer Draw',
    subtitle: 'Controlled Safety Reserve Utilization Formula',
    formula: 'Buffer_Draw = min(Max_Deficit, S_buffer * 0.5)',
    formulaTerms: [
      { term: 'Max_Deficit', meaning: 'Maximum predicted shortfall depth — how much money you need to cover the worst-case day' },
      { term: 'S_buffer * 0.5', meaning: '50% of your Safety Buffer — the absolute maximum you should ever draw from emergency reserve in one event' },
      { term: 'min(...)', meaning: 'Only draw what is needed and never more than 50% of the buffer to preserve the reserve' },
    ],
    howItWorks: 'When shortfall cannot be avoided by spending cuts, the system calculates the minimum emergency draw needed from your safety buffer. It caps this at 50% of the buffer to ensure the reserve is never fully depleted.',
    example: 'Safety Buffer = Rs.3,000 | Max Deficit = Rs.800 → Buffer Draw = min(Rs.800, Rs.1,500) = Rs.800 (only take what is needed)',
    whyItMatters: 'Emergency reserves exist for emergencies. This formula ensures they are used ONLY when necessary, ONLY as much as needed, with a built-in 50% cap to prevent total depletion.',
    badge: 'Emergency Protocol',
    badgeColor: '#B45309',
    subFormulas: null,
  },
  {
    id: 'liquidity-margin',
    icon: Shield,
    color: '#0891B2',
    bgColor: '#ECFEFF',
    borderColor: '#A5F3FC',
    category: 'Risk Intelligence',
    title: 'Liquidity Margin (3-Day Test)',
    subtitle: 'Quick Check: Can You Survive 3 More Days Without Income?',
    formula: 'Liquidity_Margin = B_t − S_buffer',
    formulaTerms: [
      { term: 'Liquidity_Margin', meaning: 'Cash cushion between current balance and safety buffer — your breathing room' },
      { term: 'Daily_Burn * 3', meaning: 'Cost of 3 days of normal spending — threshold for slim margin detection' },
    ],
    howItWorks: 'Even if no shortfall is technically predicted in 14 days, the system checks if your surplus above the buffer is less than 3 days of daily burn. If yes, an amber warning fires even without a shortfall prediction.',
    example: 'Balance Rs.3,280 | Buffer Rs.3,000 | Daily Burn Rs.290 → Margin = Rs.280 | 3-day burn = Rs.870 | Since Rs.280 < Rs.870 → Slim Margin Warning',
    whyItMatters: 'Prevents false all-clear signals. Being Rs.100 above your buffer is genuinely risky even if the 14-day math looks okay. This test catches those edge cases before they become emergencies.',
    badge: 'Warning Logic',
    badgeColor: '#0891B2',
    subFormulas: [
      { label: 'Slim Margin Trigger', formula: 'ALERT if Liquidity_Margin < (Daily_Burn * 3)', explanation: 'If margin above buffer is less than 3 days of burn, amber warning fires even if no shortfall predicted in 14 days' },
    ],
  },
  {
    id: 'running-balance',
    icon: Calculator,
    color: '#374151',
    bgColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    category: 'Core Financial Metrics',
    title: 'Running Net Balance',
    subtitle: 'Chronological Balance After Every Single Transaction',
    formula: 'Running_Balance(n) = Running_Balance(n-1) +/- Amount_n',
    formulaTerms: [
      { term: 'Running_Balance(n)', meaning: 'The cumulative balance after the n-th transaction in chronological order' },
      { term: 'Running_Balance(n-1)', meaning: 'Balance after the previous transaction — starts at Rs.0' },
      { term: '+/- Amount_n', meaning: '+Amount for income transactions, -Amount for expense transactions' },
    ],
    howItWorks: 'Every time transactions are fetched, the system sorts them chronologically (oldest first) and calculates a running total. Each transaction either adds (income) or subtracts (expense), stamping each with its net_balance at that moment in time.',
    example: 'Tx1: Stipend Rs.8,000 → Running Rs.8,000 | Tx2: Rent Rs.4,500 → Running Rs.3,500 | Tx3: Food Rs.450 → Running Rs.3,050 | Tx4: Freelance Rs.2,000 → Running Rs.5,050',
    whyItMatters: 'The transaction ledger with running balance is your financial audit trail. You can see exactly when your balance was healthy or stressed, and trace any anomaly to a specific transaction.',
    badge: 'Ledger Engine',
    badgeColor: '#374151',
    subFormulas: null,
  },
];

const categories = [...new Set(formulaData.map(f => f.category))];

function FormulaCard({ formula }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = formula.icon;
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${formula.borderColor}`,
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${formula.bgColor} 0%, #fff 100%)`,
        borderBottom: expanded ? `1px solid ${formula.borderColor}` : 'none',
        padding: '22px 26px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{
            width: '50px', height: '50px', borderRadius: '14px', flexShrink: 0,
            backgroundColor: formula.bgColor, border: `2px solid ${formula.borderColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: formula.color, boxShadow: `0 4px 12px ${formula.color}22`,
          }}>
            <Icon size={24} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: 0 }}>{formula.title}</h3>
              <span style={{
                fontSize: '10px', fontWeight: '700', padding: '2px 9px', borderRadius: '999px',
                backgroundColor: formula.bgColor, color: formula.badgeColor, border: `1px solid ${formula.borderColor}`,
              }}>{formula.badge}</span>
              <span style={{
                fontSize: '10px', fontWeight: '600', padding: '2px 9px', borderRadius: '999px',
                backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0',
              }}>{formula.category}</span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 10px 0' }}>{formula.subtitle}</p>
            <div style={{
              background: '#0F172A', borderRadius: '10px', padding: '11px 16px',
              fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: '13px', lineHeight: '1.5',
            }}>
              <span style={{ color: '#94A3B8', fontSize: '9px', display: 'block', marginBottom: '3px', fontFamily: 'inherit' }}>FORMULA</span>
              <span style={{ color: '#7DD3FC' }}>{formula.formula}</span>
            </div>
            {formula.subFormulas && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {formula.subFormulas.map((sf, i) => (
                  <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 13px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: formula.color, marginBottom: '3px' }}>{sf.label}</div>
                    <code style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: '#1E293B' }}>{sf.formula}</code>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>{sf.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setExpanded(!expanded)} style={{
            width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
            border: `1px solid ${formula.borderColor}`, backgroundColor: formula.bgColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: formula.color, transition: 'all 0.2s',
          }}>
            {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={13} /> Formula Terms
            </div>
            {formula.formulaTerms.map((t, i) => (
              <div key={i} style={{
                display: 'flex', gap: '12px', padding: '9px 12px', marginBottom: '6px',
                background: '#F8FAFC', borderRadius: '9px', border: '1px solid #E2E8F0', alignItems: 'flex-start',
              }}>
                <code style={{
                  fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: '700',
                  color: formula.color, background: formula.bgColor, padding: '2px 7px',
                  borderRadius: '5px', border: `1px solid ${formula.borderColor}`, whiteSpace: 'nowrap', flexShrink: 0,
                }}>{t.term}</code>
                <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{t.meaning}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>How It Works</div>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', background: '#F8FAFC', padding: '13px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', margin: 0 }}>
              {formula.howItWorks}
            </p>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Real Example</div>
            <div style={{
              fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#1E293B',
              background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px',
              padding: '13px 16px', lineHeight: '1.8',
            }}>{formula.example}</div>
          </div>
          <div style={{ background: `${formula.bgColor}CC`, border: `1px solid ${formula.borderColor}`, borderRadius: '12px', padding: '13px 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: formula.color, marginBottom: '7px' }}>Why This Matters</div>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: 0 }}>{formula.whyItMatters}</p>
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
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        padding: '60px 0 50px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: 'radial-gradient(circle at 25% 50%, #2563EB 0%, transparent 50%), radial-gradient(circle at 75% 50%, #7C3AED 0%, transparent 50%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
            }}>
              <Calculator size={26} color="#fff" strokeWidth={2.2} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#7DD3FC', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              System Transparency
            </span>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: '900', color: '#fff', letterSpacing: '-0.03em', lineHeight: '1.15', marginBottom: '14px' }}>
            Matrix Explanation
            <span style={{
              display: 'block', fontSize: '26px', fontWeight: '700',
              background: 'linear-gradient(90deg, #7DD3FC, #A78BFA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: '4px',
            }}>
              Every Formula. Fully Transparent.
            </span>
          </h1>
          <p style={{ fontSize: '15px', color: '#94A3B8', lineHeight: '1.7', maxWidth: '640px', marginBottom: '26px' }}>
            Cashflow Guardian is a <strong style={{ color: '#E2E8F0' }}>100% rule-based statistical system</strong> — zero black boxes.
            Every number you see is derived from these mathematical formulas applied to your real transaction data in real-time.
            No AI making guesses. Pure deterministic math.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['Real-Time Computation', 'Pure Mathematical Formulas', 'Your Actual Data', 'No Black Box AI'].map((item, i) => (
              <span key={i} style={{
                padding: '6px 14px', borderRadius: '999px',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                fontSize: '12px', fontWeight: '600', color: '#CBD5E1',
              }}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '18px 24px' }}>
          <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Formulas', value: String(formulaData.length), color: '#2563EB' },
              { label: 'Categories', value: String(categories.length), color: '#7C3AED' },
              { label: 'AI Dependency', value: '0%', color: '#059669' },
              { label: 'Calc Speed', value: '<15ms', color: '#D97706' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: '26px', fontWeight: '900', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '10px 0' }}>
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '7px 16px', borderRadius: '999px', border: '1px solid',
                borderColor: activeCategory === cat ? '#2563EB' : '#E2E8F0',
                background: activeCategory === cat ? '#EFF6FF' : '#fff',
                color: activeCategory === cat ? '#2563EB' : '#64748B',
                fontWeight: activeCategory === cat ? '700' : '600',
                fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px',
          padding: '12px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <ChevronDown size={17} color="#2563EB" />
          <p style={{ fontSize: '13px', color: '#1D4ED8', fontWeight: '500', margin: 0 }}>
            Click the <strong>expand arrow</strong> on any card to see detailed term explanations, step-by-step logic, real examples, and why each formula matters.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(f => <FormulaCard key={f.id} formula={f} />)}
        </div>

        {/* Promise box */}
        <div style={{
          marginTop: '40px', padding: '28px', borderRadius: '20px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          border: '1px solid #1E293B',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>
            Our Promise: Statistical, Not AI-Speculative
          </h3>
          <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.7', margin: 0 }}>
            Every metric in your dashboard is computed in real-time using the formulas above, applied directly to your PostgreSQL transaction database.
            No machine learning models. No black boxes. No opaque AI guesses.
            The only AI in the system is used for optional natural language input parsing — and even that falls back to rule-based extraction first.
            <br /><br />
            <strong style={{ color: '#7DD3FC' }}>When you see Rs.509/day Safe Ceiling — that number comes from your actual balance divided by your actual days remaining. Not from a model.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

