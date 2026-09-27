# Implementation Plan — Personalization & Persona Creation Feature

> **Project:** SPECIFY — AI Cashflow Guardian  
> **Module:** Persona Creation Engine & Guided Setup Wizard  
> **Specification Document:** `persona_creation.md`  
> **Database:** Neon PostgreSQL (`cashflow_db`)  

---

## 1. Executive Summary & Objective

The entire intelligence loop of SPECIFY (`OBSERVE -> PREDICT -> EXPLAIN -> INTERVENE -> LEARN -> RE-PLAN`) relies fundamentally on knowing who the user is before analyzing a single transaction.

Without a financial persona:
- Safe-to-Spend (STS) uses generic placeholder commitments.
- The 14-day trajectory engine cannot project when regular monthly stipends or salaries will arrive.
- Risk thresholds treat a college student living in a hostel identically to a salaried breadwinner supporting a family of four.

The **Persona Creation Feature** establishes a **structured financial fingerprint** during onboarding and profile configuration. It collects fixed commitments, variable lifestyle expectations, scheduled/irregular income streams, and dependent obligations to calibrate all downstream engines (Safe-to-Spend, Forecasting, Risk Alerts, and What-If Simulations).

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  USER ONBOARDING / PROFILE SETTINGS (React Frontend)                                  │
│  5-Step Wizard: Fixed Expenses ──► Variable ──► Income ──► Dependents ──► Review      │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ POST /api/persona/setup
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  BACKEND PERSONA ENGINE (FastAPI + backend/persona/engine.py)                          │
│  • Computes derived metrics (Surplus, Suggested Buffer, Risk Profile, Archetype)       │
│  • Generates 30-Day Forward Income Schedule                                            │
│  • Syncs constants table (safety_buffer, budget_week, budget_month)                    │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Atomic SQL Transaction
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  NEON POSTGRESQL (cashflow_db)                                                         │
│  • user_persona (Master record & derived metrics)                                      │
│  • persona_fixed_expenses (Committed monthly obligations)                              │
│  • persona_variable_expenses (Lifestyle baseline spend)                                │
│  • persona_income_sources (Salary, Stipend, Freelance, Reliability)                    │
│  • persona_dependents (Family support & breadwinner status)                            │
│  • persona_income_schedule (Forward 30-day calendar of expected credits)               │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
       ┌───────────────────────────────────┼──────────────────────────────────┐
       ▼                                   ▼                                  ▼
┌──────────────┐                 ┌────────────────────┐             ┌───────────────────┐
│ STS Engine   │                 │ 14-Day Trajectory  │             │ AI Guardian       │
│ Protects real│                 │ Factors scheduled  │             │ Personalized Groq │
│ fixed bills  │                 │ income calendar    │             │ contextual advice │
└──────────────┘                 └────────────────────┘             └───────────────────┘
```

---

## 3. Database Schema Implementation (Neon PostgreSQL)

We will execute migration script `backend/db/migrate_persona.py` to create the 6 tables defined in `persona_creation.md`:

### 1. `user_persona` (Master Record)
- Columns: `persona_id (UUID PK)`, `user_id (VARCHAR UNIQUE FK)`, `persona_version (INT)`, `total_fixed_expense (NUMERIC)`, `total_variable_expense (NUMERIC)`, `total_expected_income (NUMERIC)`, `net_monthly_surplus (NUMERIC)`, `suggested_safety_buffer (NUMERIC)`, `user_safety_buffer_override (NUMERIC)`, `has_dependents (BOOL)`, `number_of_dependents (INT)`, `is_primary_breadwinner (VARCHAR)`, `emergency_fund_preference (VARCHAR)`, `risk_profile (VARCHAR)`, `spending_archetype (VARCHAR)`, `setup_completed (BOOL)`, `setup_step_reached (INT)`.

### 2. `persona_fixed_expenses` (Committed Monthly Outflows)
- Columns: `fixed_expense_id (UUID PK)`, `user_id (FK)`, `label`, `category` (rent, emi, utility, subscription, insurance, academic, family_support, other), `amount`, `due_day_of_month (1..31)`, `due_day_buffer`, `payment_mode`, `is_active`.

### 3. `persona_variable_expenses` (Expected Variable Spend)
- Columns: `variable_expense_id (UUID PK)`, `user_id (FK)`, `label`, `category` (food, transport, leisure, shopping, medical, travel, self_dev, other), `expected_monthly_amount`, `min_amount`, `max_amount`, `is_active`.

### 4. `persona_income_sources` (Scheduled & Variable Income Streams)
- Columns: `income_source_id (UUID PK)`, `user_id (FK)`, `source_name`, `income_type` (salary, stipend, freelance, family_transfer, etc.), `stream_nature` ('scheduled' / 'variable'), `expected_amount`, `frequency` ('monthly', 'weekly', etc.), `expected_credit_day (1..31)`, `credit_day_buffer`, `reliability` ('always_on_time', 'occasionally_late', 'irregular'), `is_active`.

### 5. `persona_dependents` (Financial Dependents)
- Columns: `dependent_id (UUID PK)`, `user_id (FK)`, `relationship` (spouse, child, parent, sibling, other), `age_group` (child, adult, senior), `monthly_support_amount`, `is_fixed_transfer`.

### 6. `persona_income_schedule` (Monthly Income Calendar for Forecasting)
- Columns: `schedule_id (UUID PK)`, `user_id (FK)`, `income_source_id (FK)`, `expected_date (DATE)`, `expected_amount`, `date_confidence` ('high', 'medium', 'low'), `status` ('pending', 'received', 'delayed', 'cancelled').

---

## 4. Backend Engine & Mathematical Intelligence (`backend/persona/engine.py`)

### 4.1 Derived Field Computations
1. **Total Fixed Expense ($F$)**: $\sum \text{amount}$ of all active `persona_fixed_expenses` + fixed dependent transfers.
2. **Total Variable Expense ($V$)**: $\sum \text{expected_monthly_amount}$ of all active `persona_variable_expenses`.
3. **Total Expected Income ($I$)**: $\sum \text{expected_amount}$ (monthly normalized) of all active `persona_income_sources`.
4. **Net Monthly Surplus ($S$)**: $I - (F + V)$.
5. **Suggested Safety Buffer ($B_{\text{suggested}}$)**:
   - Base buffer: $\max(F \times 0.20, \; 2000.0)$
   - Dependent Cushion Multiplier:
     - If `has_dependents` and `is_primary_breadwinner == 'yes'`: $\times 1.50$ (+50%)
     - If `has_dependents`: $\times 1.25$ (+25%)
     - Otherwise: $\times 1.0$
6. **Risk Profile Classification**:
   - `conservative`: Surplus ratio $< 15\%$ or `dependents >= 2` or `is_primary_breadwinner == 'yes'`
   - `flexible`: Surplus ratio $> 40\%$ and `dependents == 0`
   - `balanced`: All standard configurations
7. **Spending Archetype**:
   - `saver`: $V / I < 0.30$ and $S / I > 0.40$
   - `free_spender`: $V / I > 0.60$ or $S \le 0$
   - `balanced`: Between $0.30$ and $0.60$

### 4.2 Forward Income Schedule Generator
* Evaluates all active income sources.
* Generates concrete calendar dates for the next 30 days based on `expected_credit_day` and frequency.
* Populates `persona_income_schedule` so the 14-day forecasting trajectory knows the exact dates cash relief arrives.

### 4.3 Database Synchronization
* Automatically updates the legacy `constants` table (`safety_buffer`, `budget_week`, `budget_month = V + F`) so that all existing dashboard widgets remain 100% synchronized and backward-compatible.

---

## 5. API Endpoints (`main.py`)

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/persona/setup` | Full wizard submission (saves master record, fixed/variable items, income sources, dependents in one transaction). |
| `GET` | `/api/persona/{user_id}` | Retrieves full persona details, sub-table arrays, and `setup_completed` status. |
| `PUT` | `/api/persona/{user_id}` | Updates top-level preferences or manual safety buffer override. |
| `GET` | `/api/persona/{user_id}/income-schedule` | Returns the forward 30-day income calendar for forecasting. |
| `POST` | `/api/persona/{user_id}/recompute` | Triggers on-demand re-calculation of derived metrics and schedule. |

---

## 6. Frontend Guided Setup Wizard (`src/components/persona/`)

### Multi-Step Wizard Architecture (`PersonaWizardModal.jsx`)
```
┌────────────────────────────────────────────────────────────────────────┐
│  SPECIFY — Financial Persona Setup Wizard                         [✕] │
│  Step 1: Fixed ──► Step 2: Variable ──► Step 3: Income ──► ...         │
├────────────────────────────────────────────────────────────────────────┤
│                                                │  LIVE SUMMARY         │
│  [Step Form Inputs...]                         │  • Fixed: ₹12,500     │
│  - Rent, EMI, Utilities, Subscriptions         │  • Variable: ₹6,000   │
│  - Quick Add custom rows with due dates        │  • Income: ₹25,000    │
│                                                │  • Surplus: +₹6,500   │
│                                                │  • Buffer: ₹3,125     │
├────────────────────────────────────────────────┴───────────────────────┤
│  [← Previous Step]                              [Next Step: Income →]  │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Step 1 — Fixed Expenses (`Step1FixedExpenses.jsx`)**:
   - Clean, blank form fields with standard category categories (Rent/Hostel, Loan/EMI, Utilities, Subscriptions, Insurance, Academic, Other).
   - Starts with 0 / blank fields so users input their exact personal commitments from scratch without synthetic presets.
   - User can add custom rows with due day of month (1–31) and payment mode.
2. **Step 2 — Variable Expenses (`Step2VariableExpenses.jsx`)**:
   - Clean baseline inputs: Food & Groceries, Transport/Fuel, Daily Commute, Leisure/Dining, Clothing, Medical.
   - Dynamic running spend total recalculates in real-time as user enters numbers.
3. **Step 3 — Income Sources (`Step3IncomeSources.jsx`)**:
   - Clean input rows for multiple income streams (Salary, College Stipend, Freelancing, Family Transfer, etc.).
   - Captures expected credit day (1–31), stream nature (scheduled vs. variable), and reliability flag (`always_on_time`, `occasionally_late`, `irregular`).
4. **Step 4 — Dependents & Obligations (`Step4Dependents.jsx`)**:
   - Simple toggle for dependents, count, monthly family support amount, and primary breadwinner status.
5. **Step 5 — Review & Confirm (`Step5ReviewConfirm.jsx`)**:
   - Interactive Financial Fingerprint Card:
     - Total Protected Commitments
     - Net Monthly Surplus estimate
     - Auto-calculated Suggested Safety Buffer (with option to override)
     - Derived Risk Profile (Conservative / Balanced / Flexible) & Spending Archetype badge (Saver / Balanced / Free Spender)
   - "Save & Apply Financial Persona" button.

### User Access Points (Manual-Only Flow)
- **Access Points**: User opens the wizard exclusively on-demand by clicking the **"👤 Financial Persona"** button in the Dashboard Overview action bar or the **"Personal Financial Persona"** card in [`SettingsView.jsx`](file:///d:/projects/HackRonyX_2.0_Ray/src/components/dashboard/SettingsView.jsx).
- **No Blocking Screen**: The dashboard remains fully accessible at all times without mandatory or forced onboarding modals.

---

## 7. Downstream System Upgrades

1. **Safe-to-Spend (STS) Engine**:
   - Replaces hardcoded commitments with real active monthly fixed expenses from `persona_fixed_expenses`.
2. **14-Day Trajectory Engine**:
   - Reads `persona_income_schedule` to know scheduled income dates rather than assuming zero inflows.
3. **AI Guardian Copilot**:
   - Injects persona context (`risk_profile`, `spending_archetype`, `dependents`) into Groq system prompt so advice is tailored to their specific lifestyle.
4. **What-If Simulator**:
   - Uses persona's real fixed commitments to calculate accurate safe price ceilings.

---

## 8. Step-by-Step Implementation Roadmap

- [x] **Phase 1: Database Migration**: Write and execute `backend/db/migrate_persona.py` to create the 6 tables in Neon PostgreSQL. (COMPLETED)
- [x] **Phase 2: Backend Persona Engine**: Implement `backend/persona/engine.py` with derived metrics calculation, schedule generation, and constants sync. (COMPLETED)
- [x] **Phase 3: FastAPI Endpoints**: Add `/api/persona/setup`, `/api/persona/{user_id}`, and `/api/persona/{user_id}/income-schedule` in `main.py`. (COMPLETED)
- [ ] **Phase 4: Downstream Engine Linking**: Connect STS, Trajectory, and AI Guardian to persona records.
- [ ] **Phase 5: Frontend Wizard Components**: Build `PersonaWizardModal.jsx` with Steps 1–5 and live summary sidebar.
- [ ] **Phase 6: Verification**: End-to-end browser and automated test verifying database persistence and live UI updates.
