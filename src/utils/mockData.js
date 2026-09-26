// Initial mock dataset for SPECIFY demo

export const INITIAL_FORECAST_DATA = [
  { day: 'Oct 17', expected: 6400, best: 6400, worst: 6400, event: 'Starting Balance', type: 'neutral' },
  { day: 'Oct 18', expected: 6250, best: 6300, worst: 6200, event: 'Coffee & Canteen (₹150)', type: 'expense' },
  { day: 'Oct 19', expected: 6100, best: 6200, worst: 6000, event: 'UPI Book Purchase (₹150)', type: 'expense' },
  { day: 'Oct 20', expected: 10100, best: 10600, worst: 9600, event: 'Family Transfer (+₹4,000)', type: 'income' },
  { day: 'Oct 21', expected: 9850, best: 10400, worst: 9300, event: 'Groceries (₹250)', type: 'expense' },
  { day: 'Oct 22', expected: 9600, best: 10200, worst: 9000, event: 'Recharge & Data (₹250)', type: 'expense' },
  { day: 'Oct 23', expected: 9400, best: 10100, worst: 8700, event: 'Daily Transport (₹200)', type: 'expense' },
  { day: 'Oct 24', expected: 6900, best: 7600, worst: 6200, event: 'Mess Fee Debit (-₹2,500)', type: 'essential' },
  { day: 'Oct 25', expected: 6700, best: 7500, worst: 5900, event: 'Projected Low Point', type: 'low' },
  { day: 'Oct 26', expected: 5200, best: 6100, worst: 4300, event: 'Rent Reserve (-₹1,500)', type: 'essential' },
  { day: 'Oct 27', expected: 5000, best: 6000, worst: 4000, event: 'Daily Canteen (₹200)', type: 'expense' },
  { day: 'Oct 28', expected: 4800, best: 5900, worst: 3700, event: 'Stationery (₹200)', type: 'expense' },
  { day: 'Oct 29', expected: 4600, best: 5800, worst: 3400, event: 'Expected Freelance Credit (+₹2,000)', type: 'income' },
  { day: 'Oct 30', expected: 6600, best: 7800, worst: 5400, event: 'End of Horizon', type: 'neutral' }
];

export const DEMO_SCENARIO_STEPS = [
  {
    id: 1,
    title: "1. Stable Position",
    badge: "Baseline",
    badgeColor: "blue",
    description: "User starts in a healthy financial position with predictable recurring income and commitments.",
    stsValue: "₹ 3,450.00",
    riskLevel: "Low Risk",
    riskColor: "green",
    explanation: "Expected income (Family transfer ₹4,000) comfortably covers mess fee (₹2,500) and rent (₹1,500) with a ₹550 safety buffer.",
    actionSuggested: "None required — Safe-to-Spend is healthy."
  },
  {
    id: 2,
    title: "2. Income Shock",
    badge: "Income Delayed",
    badgeColor: "amber",
    description: "Freelance stipend credit of ₹2,000 expected on Oct 25 is delayed by 5 days.",
    stsValue: "₹ 1,450.00",
    riskLevel: "Moderate Risk",
    riskColor: "amber",
    explanation: "Delay of ₹2,000 credit shifts projected cash trough closer to safety buffer boundary.",
    actionSuggested: "Monitor variable daily spending closely."
  },
  {
    id: 3,
    title: "3. Unexpected Expense",
    badge: "Debit Shock",
    badgeColor: "amber",
    description: "Unplanned laptop repair debit of ₹1,800 is processed via UPI.",
    stsValue: "₹ 200.00",
    riskLevel: "High Risk",
    riskColor: "amber",
    explanation: "Laptop repair (₹1,800) + delayed income reduces lowest projected balance to ₹1,400.",
    actionSuggested: "Immediate protective intervention required."
  },
  {
    id: 4,
    title: "4. Risk Detection",
    badge: "Buffer Breach Warning",
    badgeColor: "amber",
    description: "Engine detects high risk of breaching the ₹550 safety buffer on Oct 26 before rent debit.",
    stsValue: "₹ 0.00 (Locked)",
    riskLevel: "Critical Buffer Risk",
    riskColor: "amber",
    explanation: "Projected balance (₹1,400) minus protected commitments (₹1,200 mess + rent) leaves only ₹200, breaching your ₹550 buffer by ₹350.",
    actionSuggested: "Suggesting Protective Spend-Cap."
  },
  {
    id: 5,
    title: "5. Dynamic Re-Calculation",
    badge: "Live Recalculation",
    badgeColor: "blue",
    description: "Safe-to-Spend recomputes live in 0.4 seconds across all 14 forecast days.",
    stsValue: "₹ 150.00 / day",
    riskLevel: "Active Mitigation",
    riskColor: "blue",
    explanation: "System recalculates safe daily allowance required to absorb the ₹350 buffer deficit.",
    actionSuggested: "Apply Daily Spend Cap of ₹150 for 4 days."
  },
  {
    id: 6,
    title: "6. Plain-Language Explanation",
    badge: "Explainability Trace",
    badgeColor: "blue",
    description: "Traceable reason linking specific transactions to the risk state.",
    stsValue: "₹ 150.00 / day",
    riskLevel: "Traceable",
    riskColor: "blue",
    explanation: "Cause: Laptop Repair (₹1,800 on Oct 21) + Freelance Delay (₹2,000). Impact: Potential ₹350 buffer deficit on Oct 26.",
    actionSuggested: "Card recommendation with explicit reasoning."
  },
  {
    id: 7,
    title: "7. Protective Action Card",
    badge: "Intervention",
    badgeColor: "green",
    description: "System presents semi-automated protective recommendation card with Accept/Reject/Modify controls.",
    stsValue: "₹ 150.00 / day",
    riskLevel: "User Decision Pending",
    riskColor: "blue",
    explanation: "Option A: Set ₹150/day spend limit. Option B: Defer optional subscription (₹499). Option C: Request family top-up.",
    actionSuggested: "User selects [ Accept Option A ]."
  },
  {
    id: 8,
    title: "8. Feedback & Learning Loop",
    badge: "Learning Cycle 1 Complete",
    badgeColor: "green",
    description: "User accepts Option A. System updates internal action weights and adapts future behavior.",
    stsValue: "₹ 150.00 / day (Active)",
    riskLevel: "Risk Mitigated",
    riskColor: "green",
    explanation: "System logs acceptance of 'Daily Spend Cap' (Weight +0.25). Future shortfall alerts will prioritize daily caps over subscription deferrals.",
    actionSuggested: "System learned preference for Daily Spend Caps."
  }
];

export const FAQ_ITEMS = [
  {
    q: "How is Safe-to-Spend different from my bank balance?",
    a: "Your bank balance shows what you have right now, ignoring what you owe tomorrow. Safe-to-Spend continuously forecasts upcoming recurring commitments (rent, mess, subscriptions) and protects a safety buffer. It shows the exact amount you can spend today without risking a shortfall later in the 7–14 day window."
  },
  {
    q: "Does the system use LLMs for numeric calculations?",
    a: "No. All numbers, forecasts, confidence intervals, and Safe-to-Spend values are calculated using 100% deterministic statistical algorithms (moving averages + scheduled commitment rules). Large Language Models are used strictly for natural-language explainability summaries, preventing any numeric hallucinations."
  },
  {
    q: "How does SPECIFY categorize Indian transaction patterns?",
    a: "The ingestion pipeline features specialized pattern matchers for Indian financial transactions, including UPI merchant strings (e.g. Swiggy, Zomato, Canteen), stipend credit narrations, family bank transfers, mess fees, and subscription debits."
  },
  {
    q: "What happens during the Live Judge Evaluation?",
    a: "During hackathon judging, evaluators can upload custom CSV transaction files or inject ad-hoc expense/income events in real time. The core engine recomputes the forecast, Safe-to-Spend, and risk alerts live in under 1 second without hardcoded screens."
  },
  {
    q: "Does SPECIFY move real money or integrate bank credentials?",
    a: "No. Product guardrails strictly keep SPECIFY as a simulated personal cash-flow intelligence agent. It operates on uploaded CSV/JSON feeds and simulated accounts without requiring OAuth bank logins or real fund movements."
  }
];
