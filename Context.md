# AI Cashflow Guardian — Project Context

> **Hackronyx 2.0 | Final Round | R2-P4**
>
> **Product:** A proactive, explainable personal cash-flow agent for students and young professionals.
>
> **Core question:** “Given what is coming in and going out, how much can I safely spend today?”

---

## 1. Problem

Users may have irregular income:

- Salary / stipend
- Freelance income
- Family transfers

while managing:

- Rent / mess / food
- Subscriptions
- Transport
- Academic expenses
- Travel
- Unexpected expenses

Most finance apps mainly explain **past spending**.

**Our problem:** users need a forward-looking view of what is likely to happen next and how much they can safely spend now without creating a future cash shortage.

---

## 2. Solution

AI Cashflow Guardian continuously runs:

```text
OBSERVE → PREDICT → EXPLAIN → INTERVENE → LEARN → RE-PLAN
```

### What each stage means

- **Observe:** ingest transactions + upcoming financial events.
- **Predict:** forecast cash position for the next 7–14 days.
- **Explain:** show why forecast, risk or STS changed.
- **Intervene:** recommend / simulate a protective action.
- **Learn:** record Accept / Reject / Modify feedback.
- **Re-plan:** recompute when data or feedback changes.

This loop is the heart of the product.

---

## 3. Core Modules

```text
Data Ingestion
      ↓
Normalization + Data Quality
      ↓
Transaction Categorization
      ↓
7–14 Day Forecast
      ↓
Confidence / Uncertainty
      ↓
Safe-to-Spend
      ↓
Shortfall Risk + Cause
      ↓
Recommendation
      ↓
Explainability
      ↓
Feedback / Learning
      ↓
RE-PLAN
```

### Transaction categorization

Support common Indian patterns:

```text
UPI
SALARY / STIPEND
FAMILY TRANSFER
FREELANCE
RENT
SUBSCRIPTION
ATM / CASH
FOOD
TRANSPORT
ACADEMIC
TRAVEL
UNEXPECTED / EMERGENCY
```

Use **rules / regex first**. Use an **LLM only as a fallback for ambiguous classification**.

---

## 4. Forecasting

Forecast the user's daily cash position for the next **7–14 days** using:

- Current balance
- Historical transactions
- Recurring income / expenses
- Expected income dates
- Irregular income patterns
- Upcoming known events
- Variable spending patterns

Output:

```text
Expected case
Lower / worst range
Upper / best range
Confidence / uncertainty
```

### Financial AI rule

**Do not use an LLM as the sole numeric forecasting engine.**

Preferred approach:

```text
Historical patterns
+ recurring events
+ known future events
+ lightweight uncertainty simulation
```

The calculation must be deterministic and auditable.

---

## 5. Safe-to-Spend (STS)

```text
Safe-to-Spend
=
Lowest Projected Balance
− Protected Essential Commitments
− Safety Buffer
```

Protected money may include:

- Rent
- Required bills
- Essential recurring commitments

STS must update whenever the financial state changes.

The UI must clearly show:

```text
PROTECTED / COMMITTED MONEY
vs.
FREELY SPENDABLE MONEY
```

**Every STS change must explain why.**

---

## 6. Shortfall Risk

Detect a possible cash shortage **before it happens**.

Risk output should include:

```text
Severity
Expected date
Projected shortfall
Root cause
Affected transaction / event
Recommended action
Explanation
```

Typical causes:

- Delayed stipend / salary
- Unexpected expense
- Multiple small expenses accumulating
- Recurring payment before income
- Reduced / delayed family transfer

Example:

> “Your projected balance may fall below the safety buffer by Thursday because the stipend is delayed by 3 days and a ₹1,200 unexpected expense was added.”

---

## 7. Recommendation Engine

When risk increases, recommend at least one protective action.

Examples:

- Reduce discretionary spending
- Set a daily spending cap
- Defer a discretionary payment
- Create a due-date reminder
- Flag a non-essential subscription
- Notify the user about a tight period

Ranking should consider:

```text
Impact + Feasibility + User Feedback
```

At least one action should be **simulated / semi-automated**.

**No real money movement.**

---

## 8. Learning Loop

For every recommendation store:

```text
recommendation_id
action_type
timestamp
user_response
optional_modification
```

Responses:

```text
ACCEPT
REJECT
MODIFY
```

Feedback must change future recommendation ranking.

```text
Repeated Reject → lower action preference
Repeated Accept → higher action preference
```

The demo must show **at least 2 genuine learning cycles**.

---

## 9. Explainability

Every:

- Forecast
- STS value
- Risk alert
- Recommendation

must answer:

> **WHY did this happen?**

Preferred implementation:

```text
Structured causes / impacts
        ↓
Deterministic explanation template
        ↓
Optional LLM wording polish
```

Explanations must reference the real transaction/event responsible for the change.

Never show unexplained AI numbers.

---

## 10. Key Differentiators

### Dynamic Safe-to-Spend
Not just current balance or past spending; calculates safely spendable money after protecting future obligations.

### Forward-Looking Liquidity
Focuses on the user's next 7–14 days.

### Explainable Causality
Every important change has a traceable reason.

### Evidence-Aware Uncertainty
When historical evidence is weak, confidence should decrease and the uncertainty band should widen instead of pretending certainty.

### What-If Replanning

Examples:

```text
What if my stipend is delayed by 3 days?
What if I add a ₹2,000 trip?
```

Forecast, STS, risk and recommendations should update live.

### Real Learning
User feedback changes future recommendation behavior.

### Visible Agent Trace

```text
OBSERVE
  ↓
PREDICT
  ↓
EXPLAIN
  ↓
INTERVENE
  ↓
LEARN
  ↓
RE-PLAN
```

---

## 11. Suggested Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Recharts / equivalent

### Backend
- Python
- FastAPI

### Intelligence
- Pandas / NumPy
- Deterministic forecasting logic
- Lightweight Monte Carlo / uncertainty simulation
- Rule-based categorization
- Optional LLM for ambiguity + language

### Storage
- SQLite / in-memory for hackathon
- PostgreSQL if required

### Principle

> **Prefer reliability, speed and explainability over unnecessary model complexity.**

---

## 12. Live Demo Flow

The organizer-required scenario:

```text
1. Start with stable finances
2. Delay / change expected income
3. Add unexpected expense
4. Risk increases
5. Forecast + STS update
6. System explains why
7. Protective action is suggested / demonstrated
8. Feedback changes a later recommendation
```

### Judge should be able to

- Add a transaction
- Modify an event
- Delay expected income
- Add an unexpected expense

and immediately see:

```text
Forecast changes
STS changes
Risk changes
Explanation changes
Recommendation changes
```

---

## 13. Product Boundaries

This is **NOT**:

- Banking
- Real payment / fund transfer
- Lending
- Credit scoring
- Investment recommendation
- Financial-product recommendation

All actions are **simulated / demonstrated only**.

---

## 14. Engineering Rules

1. **No hardcoded intelligence** — visible financial numbers must come from current state.
2. **Recompute on state change** — new transaction/event/feedback triggers re-planning.
3. **Explain important numbers** — no unexplained STS/risk/forecast changes.
4. **Deterministic finance, optional LLM language** — LLM does not own financial math.
5. **Graceful data handling** — malformed, incomplete and duplicate-looking input must not crash the app.
6. **Learning must be real** — feedback must affect future ranking.
7. **Keep scope focused** — prioritize the intelligence loop over cosmetic or unrelated features.

---

## 15. MVP Definition of Done

The following must work end-to-end:

```text
INPUT
  ↓
NORMALIZE
  ↓
CATEGORIZE
  ↓
FORECAST
  ↓
CONFIDENCE
  ↓
SAFE-TO-SPEND
  ↓
RISK
  ↓
CAUSE
  ↓
RECOMMEND
  ↓
EXPLAIN
  ↓
ACCEPT / REJECT / MODIFY
  ↓
LEARN
  ↓
RE-PLAN
```

And the complete flow must respond to **live judge input without hardcoded outputs**.

---

## 16. One-Line Positioning

> **AI Cashflow Guardian is not an expense tracker; it is a forward-looking, explainable liquidity agent that helps users understand how much they can safely spend today while preparing for what happens next.**
