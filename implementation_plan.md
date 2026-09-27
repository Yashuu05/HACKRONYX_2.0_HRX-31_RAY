# Implementation Plan — Condition-Based Alert System

> **Project:** SPECIFY (AI Cashflow Guardian)  
> **Module:** Proactive Alert Engine & Neon Database Notification Center  
> **Database:** Neon PostgreSQL (`alerts` table)  
> **Document Purpose:** Architectural Specification & Implementation Blueprint  

---

## 1. Executive Summary & Objective

SPECIFY currently computes real-time metrics including **Net Bank Balance**, **Safe-to-Spend**, **Safety Buffer**, **Weekly Budget**, **Monthly Budget**, and **Shortfall Trajectory**. However, while the database schema in Neon PostgreSQL includes an `alerts` table, it currently contains zero records and is disconnected from the operational pipeline.

The goal of this implementation is to establish a **continuous, condition-based Alert Engine** that:
1. Automatically audits user telemetry against pre-defined financial rules (e.g., net balance dropping below monthly or weekly budgets, safety buffer breaches, spending velocity spikes).
2. Persists structured notifications into the Neon PostgreSQL `alerts` table with cooldown deduplication.
3. Exposes a non-intrusive **Notification Center & Alert Bell** in the frontend dashboard, allowing users to observe, acknowledge, and resolve alerts without altering or disrupting any existing dashboard features.

---

## 2. Task 1: Taxonomy of Condition-Based Alerts

The alert engine operates on pre-defined mathematical rules comparing **current net balance**, **cumulative spend**, **configured budget constants**, and **transaction velocity**.

Every alert strictly complies with the PostgreSQL `alert_level` constraint:
$$\text{alert\_level} \in \{\text{'low'}, \text{'mid'}, \text{'high'}, \text{'critical'}\}$$

### Alert Types & Mathematical Rules

| Alert Type | Level | Mathematical Condition | Trigger Rationale | User-Facing Notification Template |
| :--- | :---: | :--- | :--- | :--- |
| **`NET_BALANCE_BELOW_WEEKLY_BUDGET`** | `mid` | $\text{Net Balance} < \text{Weekly Budget}$ and $\text{Net Balance} \ge \text{Safety Buffer}$ | User has less total liquid cash than their standard 7-day spending target. | *"Your net balance (₹{balance}) has dropped below your weekly budget allowance (₹{weekly_budget}). Immediate spending restraint advised."* |
| **`NET_BALANCE_BELOW_MONTHLY_BUDGET`** | `low` | $\text{Net Balance} < \text{Monthly Budget}$ and $\text{Net Balance} \ge \text{Weekly Budget}$ | Cash reserves have fallen below the 30-day baseline target. Early warning indicator. | *"Your current balance (₹{balance}) is now below your monthly budget target of ₹{monthly_budget}. Review upcoming discretionary commitments."* |
| **`SAFETY_BUFFER_BREACH_IMMINENT`** | `critical` | $\text{Net Balance} < \text{Safety Buffer}$ | Emergency capital is actively breached. Immediate liquidity crisis risk. | *"CRITICAL: Bank balance (₹{balance}) has breached your emergency safety buffer (₹{safety_buffer}). Deficit is ₹{deficit}."* |
| **`WEEKLY_BUDGET_OVERRUN`** | `high` | $\sum_{7\text{ days}} \text{Expenses} > \text{Weekly Budget}$ | Cumulative spend in the last 7 rolling days has exceeded the user's allocated limit. | *"Weekly budget exceeded! You spent ₹{week_spend} over the last 7 days against your ₹{weekly_budget} limit (+₹{overrun})."* |
| **`HIGH_DISCRETIONARY_BURN_RATE`** | `mid` | $\text{Daily Burn Velocity} > 1.5 \times \left(\frac{\text{Weekly Budget}}{7}\right)$ | Discretionary outflow velocity is >50% above the baseline daily sustainable burn rate. | *"Spending velocity surge: Your recent outflow is ₹{daily_burn}/day, exceeding your ₹{daily_burn_baseline}/day baseline."* |
| **`LARGE_ANOMALOUS_EXPENSE`** | `high` | Single Expense $\ge 0.5 \times \text{Safety Buffer}$ or $\ge 0.35 \times \text{Net Balance}$ | A single transaction absorbed a major fraction of emergency reserves. | *"Large debit detected: An expense of ₹{amount} ('{description}') absorbed {pct}% of your safety reserves."* |
| **`SAFE_TO_SPEND_EXHAUSTED`** | `high` | $\text{Safe-to-Spend} \le 0$ while $\text{Net Balance} > 0$ | Mandatory bills (Rent/Mess) and safety buffer lock all remaining liquid cash. | *"Safe-to-Spend is ₹0.00 today. All remaining funds are strictly reserved for protected bills and emergency buffer."* |
| **`UPCOMING_BILL_COLLISION`** | `mid` | $\text{Net Balance} - \text{Upcoming Bill} < \text{Safety Buffer}$ (within 3 days) | A scheduled recurring debit will push the balance below buffer if not replenished. | *"Upcoming debit alert: Protected payment of ₹{bill_amount} on {date} will leave your safety buffer vulnerable."* |

---

## 3. Task 2: Storage & Persistence in Neon Database

### 3.1 Database Schema Alignment
The `alerts` table in the Neon PostgreSQL database (`cashflow_db`) is pre-configured with the following structure:

```sql
CREATE TABLE IF NOT EXISTS alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('low', 'mid', 'high', 'critical')),
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Deduplication & 24-Hour Cooldown Strategy
To prevent spamming the database whenever a user refreshes their dashboard or records multiple small transactions:
1. **Cooldown Window**: Before inserting a new alert of type `T` for user `U`, the evaluator checks if an identical `alert_type` was created within the last **24 hours** (or is currently unread):
   ```sql
   SELECT COUNT(*) FROM alerts
   WHERE user_id = %s
     AND alert_type = %s
     AND (is_read = FALSE OR created_at > NOW() - INTERVAL '24 HOURS');
   ```
2. **State Transition Insertion**: If the condition is resolved (e.g. user deposits income and balance rises above buffer), the alert is naturally resolved or can be auto-archived. When the threshold is re-breached after resolution, a fresh alert is logged.

### 3.3 Backend Evaluation Engine (`backend/alerts/engine.py`)
A modular alert engine evaluated asynchronously:
* **Function**: `evaluate_user_alerts(user_id: str) -> List[Dict[str, Any]]`
  * Reads current user constants (`budget_week`, `budget_month`, `safety_buffer`) from the `constants` table.
  * Queries real-time transaction aggregates (net balance, 7-day spend, daily burn) from the `transactions` table.
  * Evaluates the 8 alert conditions in sequence.
  * Filters out alerts currently in the cooldown window.
  * Performs batch `INSERT INTO alerts` for newly triggered conditions.
  * Returns the active alert list with unread counts.

### 3.4 API Endpoints in FastAPI (`main.py`)
1. **`GET /api/alerts?user_id={user_id}&unread_only={bool}&limit=50`**
   * Returns: `{ "status": "success", "unread_count": int, "alerts": [...] }`
2. **`POST /api/alerts/evaluate/{user_id}`**
   * Manually triggers evaluation and returns newly created alerts.
3. **`PATCH /api/alerts/{alert_id}/read`**
   * Marks a specific alert as read (`is_read = TRUE`).
4. **`POST /api/alerts/read-all`**
   * Body: `{ "user_id": str }` $\rightarrow$ Sets `is_read = TRUE` for all user alerts.
5. **`DELETE /api/alerts/{alert_id}`**
   * Deletes an acknowledged notification from the database.

### 3.5 Operational Trigger Hooks
The alert engine will automatically execute upon:
* **Hook A**: Any transaction creation (`POST /api/transactions`, `POST /api/transactions/quick-add`, `POST /api/transactions/nl-add`, CSV dataset upload).
* **Hook B**: User constants update (`PUT /api/users/constants/{user_id}`).
* **Hook C**: Periodic client mount check on Dashboard Overview.

---

## 4. Task 3: Frontend Dashboard Integration (Non-Intrusive Access)

To ensure **zero disturbance** to existing features (Overview, Analytics, Transactions, AI Guardian, Matrix Explanation, Settings), the alert interface is integrated via a **non-intrusive notification architecture**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  SPECIFY Dashboard Navbar / Header                                                     │
│  [Logo] SPECIFY      [Dashboard Tabs...]          [ 🔔 Alerts (3) ]   [User Avatar]    │
└───────────────────────────────────────────────────┬────────────────────────────────────┘
                                                    │
                                                    ▼ (Click triggers flyout)
                       ┌────────────────────────────────────────────────────────────────┐
                       │  🔔 NOTIFICATION CENTER                                         │
                       │  [All (5)]  [Unread (3)]  [Critical (1)]     [Mark all read ✓]  │
                       ├────────────────────────────────────────────────────────────────┤
                       │  🔴 CRITICAL • 10m ago                           [Mark Read ✓] │
                       │  Safety Buffer Breached! Net balance (₹250.00) is ₹1,750 below │
                       │  your ₹2,000 emergency buffer.                                 │
                       ├────────────────────────────────────────────────────────────────┤
                       │  🟠 HIGH • 1h ago                                [Mark Read ✓] │
                       │  Weekly Budget Overrun: You spent ₹2,600 in the last 7 days.   │
                       ├────────────────────────────────────────────────────────────────┤
                       │  🔵 MID • Yesterday                              [Mark Read ✓] │
                       │  Net Balance below Weekly Budget target (₹2,500.00).           │
                       └────────────────────────────────────────────────────────────────┘
```

### Component Architecture & Placement

1. **Header Alert Bell (`NotificationBell.jsx`)**:
   * Placed in the top-right header area of [`DashboardOverview.jsx`](file:///d:/projects/HackRonyX_2.0_Ray/src/components/dashboard/DashboardOverview.jsx) or top header bar in [`DashboardNavbar.jsx`](file:///d:/projects/HackRonyX_2.0_Ray/src/components/dashboard/DashboardNavbar.jsx).
   * Displays an animated notification badge (e.g. red pill with count `3`) when unread alerts exist.
   * Clicking toggles the **Notification Center Drawer / Popover**.

2. **Notification Drawer / Flyout (`NotificationCenter.jsx`)**:
   * Floats smoothly over the screen with a clean glassmorphic backdrop.
   * Displays alert items with:
     * Color-coded severity badge:
       * `critical`: Red pill with `<ShieldAlert size={14} />`
       * `high`: Amber pill with `<AlertTriangle size={14} />`
       * `mid`: Blue pill with `<Bell size={14} />`
       * `low`: Slate pill with `<Info size={14} />`
     * Relative timestamp (e.g., *"12 mins ago"*, *"Today 03:45 PM"*).
     * Clear causal explanation.
     * Quick-action **"Mark as Read"** icon button.
     * **"Discuss with AI Guardian"** button that routes to chat with pre-filled prompt.
   * Header actions: **"Mark All as Read"** and filter pills (`All`, `Unread`, `Critical`).

3. **High-Severity Alert Banner on Dashboard (`CriticalAlertBanner.jsx`)**:
   * If there is an active, unread `critical` alert (such as safety buffer breach), a slim banner renders at the very top of `DashboardOverview.jsx`.
   * Includes a dismiss button `[✕]` so the user can acknowledge it without cluttering their view.

4. **Zero Impact on Existing Views**:
   * Isolated state via custom React hook: `useAlerts(activeUserId)`.
   * All existing views (`AnalyticsView`, `TransactionsView`, `AIChatWidget`, `MatrixExplanation`, `SettingsView`) continue operating without modifications to their props or routing.

---

## 5. Step-by-Step Implementation Roadmap

```
┌─────────────────────────────────┐
│ Phase 1: Backend Alert Engine   │ ──► • Write backend/alerts/engine.py
│                                 │     • Implement condition evaluation logic
└─────────────────────────────────┘     • Add 24h deduplication cooldown
                 │
                 ▼
┌─────────────────────────────────┐
│ Phase 2: REST Endpoints & Hooks │ ──► • Add /api/alerts endpoints in main.py
│                                 │     • Connect transaction hook trigger
└─────────────────────────────────┘     • Unit test with real Neon DB data
                 │
                 ▼
┌─────────────────────────────────┐
│ Phase 3: Frontend Notification  │ ──► • Build NotificationBell & NotificationCenter
│          Center UI              │     • Integrate unread badge & mark-as-read
└─────────────────────────────────┘     • Add dismissible critical banner
                 │
                 ▼
┌─────────────────────────────────┐
│ Phase 4: Live Verification      │ ──► • Test balance < weekly_budget trigger
│                                 │     • Test balance < monthly_budget trigger
└─────────────────────────────────┘     • Verify Neon DB alerts table persistence
```

### Phase 1: Backend Alert Engine (`backend/alerts/engine.py`)
- [ ] Create `backend/alerts/engine.py` with evaluation rules for:
  - Net balance < weekly budget
  - Net balance < monthly budget
  - Net balance < safety buffer
  - Weekly spend > weekly budget limit
  - Anomaly single expense detection
  - Daily burn surge detection
- [ ] Implement cooldown query to prevent duplicate alert insertion within 24 hours.
- [ ] Connect database connection via `db.database.get_db_connection()`.

### Phase 2: FastAPI Routing & Ingestion Hooks (`main.py`)
- [ ] Add `GET /api/alerts` to query active user alerts from `alerts` table.
- [ ] Add `PATCH /api/alerts/{alert_id}/read` and `POST /api/alerts/read-all`.
- [ ] Add `POST /api/alerts/evaluate/{user_id}` for on-demand trigger.
- [ ] Wire evaluator hook into `POST /api/transactions` and `POST /api/users/constants/{user_id}`.

### Phase 3: Frontend Notification Center UI (`src/components/dashboard/`)
- [ ] Create `src/components/dashboard/NotificationBell.jsx` with unread badge counter.
- [ ] Create `src/components/dashboard/NotificationCenter.jsx` (flyout/modal with filters and severity styling).
- [ ] Add optional `CriticalAlertBanner.jsx` at the top of `DashboardOverview.jsx`.
- [ ] Mount bell icon into `DashboardOverview.jsx` top action bar next to "Add Transaction".

### Phase 4: End-to-End Testing & Verification
- [ ] Run test script inserting transactions that trigger weekly budget breach.
- [ ] Verify rows appear in PostgreSQL `alerts` table.
- [ ] Verify notifications render in UI, unread count increments, and "Mark as Read" updates Neon DB.

---

## 6. Verification Criteria

1. **Database Verification**:
   * Running `SELECT * FROM alerts;` against Neon PostgreSQL returns valid rows containing `user_id`, `alert_level`, `alert_type`, and descriptive `message`.
2. **Deduplication Verification**:
   * Multiple calls to `/api/alerts/evaluate/{user_id}` within 24 hours do not create duplicate rows for the same condition.
3. **Frontend Non-Intrusiveness**:
   * Dashboard Overview, 7–14 Day Forecast chart, Safe-to-Spend visualizer, Transactions feed, and AI Chat continue rendering identically.
   * Clicking notification bell smoothly opens the drawer; marking alerts as read updates unread counter and Neon DB state in real-time.
