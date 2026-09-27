# What-If Studio: Mathematical Formulas & Metrics Reference

> **System:** SPECIFY — AI Cashflow Guardian  
> **Module:** What-If Counterfactual Pre-Purchase Simulator & "Safe-to-Swipe" Engine  
> **Status:** Fully Documented & Integrated into Matrix Explanation Reference  
> **Scope Directive:** Implements Pillars 1, 2, and 3. *(Pillar 4: One-Click Action Pathways is intentionally excluded per user specification).*

---

## 1. Executive Summary & Objective

The **What-If Pre-Purchase Simulator** transforms SPECIFY from a retrospective expense tracker into a **predictive decision-support copilot**. Instead of logging financial damage after the cash is already gone, it enables users to simulate a prospective discretionary expense (e.g. ₹3,500 for headphones, ₹2,000 for a weekend dinner) before swiping their card.

The system evaluates the mathematical impact of that purchase against the user's live Neon PostgreSQL records, generating:
1. **Dual-Timeline Counterfactual Trajectory** ($B_{\text{sim}}(t)$ vs $B_{\text{base}}(t)$)
2. **Safe-to-Swipe Decision Score** ($\text{Score}_{\text{swipe}} \in [0, 100]$)
3. **AI Smart Compromise Engine** (Time-Shift $T_{\text{delay}}$, Price Ceiling $C_{\text{safe}}$, and Burn Cut $\Delta \text{Burn}$)

All metrics are **100% deterministic**, reproducible, and cross-referenced in the dashboard's [`MatrixExplanation.jsx`](file:///d:/projects/HackRonyX_2.0_Ray/src/components/dashboard/MatrixExplanation.jsx) component.

---

## 2. Complete Metric Catalog

| Metric Symbol | Full Name | Range / Unit | Data Source (Neon PostgreSQL) | Description |
| :--- | :--- | :---: | :--- | :--- |
| $B_t$ | Current Net Balance | $\ge 0$ INR | `SUM(income) - SUM(expense)` in `transactions` | Total liquid cash available in the user's account right now. |
| $S_{\text{buffer}}$ | Emergency Safety Buffer | INR (e.g. ₹3,000) | `constants.safety_buffer` | The non-negotiable cash reserve floor that must not be crossed. |
| $W_{\text{budget}}$ | Weekly Budget Allowance | INR (e.g. ₹5,000) | `constants.budget_week` | User-defined target spending ceiling for rolling 7-day windows. |
| $\text{Burn}_{\text{disc}}$ | Discretionary Daily Burn | INR / day | `transactions` (excl. Rent/Mess/Tuition) | 30-day rolling average of discretionary daily outflows. |
| $\text{Tx}_{\text{sim}}$ | Simulated Purchase Amount | INR | User Input (Hypothetical) | The prospective expenditure being evaluated before payment. |
| $\text{Bills}_{7\text{d}}$ | Committed 7-Day Bills | INR | `transactions` (Scheduled status) | Mandatory fixed payments due within the next 7 days (rent, mess). |
| $\text{Surplus}_{\text{sim}}$ | Simulated Safe Surplus | INR (can be $< 0$) | Computed ($B_t - \text{Tx}_{\text{sim}} - S_{\text{buffer}} - \text{Bills}_{7\text{d}}$) | Remaining liquid cash strictly above safety buffer and scheduled bills. |
| $\text{Score}_{\text{swipe}}$ | Safe-to-Swipe Score | $0 \dots 100$ | Computed Affordability Index | Objective 0–100 score indicating whether purchase is safe right now. |
| $B_{\text{base}}(t)$ | Baseline Projected Balance | INR / day ($t \in 1..14$) | Shortfall Trajectory Engine | Projected balance on day $t$ assuming standard baseline burn. |
| $B_{\text{sim}}(t)$ | Simulated Projected Balance | INR / day ($t \in 1..14$) | Counterfactual Simulation Engine | Projected balance on day $t$ with $\text{Tx}_{\text{sim}}$ deducted on Day 0. |
| $\Delta R_{\text{shortfall}}$ | Shortfall Risk Delta | $-100 \dots +100$ | Computed ($R_{\text{sim}} - R_{\text{base}}$) | Jump in shortfall risk score caused by making the purchase. |
| $T_{\text{delay}}$ | Time-Shift Delay | Days ($0 \dots 14$) | Trajectory Simulation Loop | Minimum days to postpone the purchase until fresh inflow clears. |
| $C_{\text{safe}}$ | Safe Price Ceiling | INR | Computed $\max(0, B_t - S_{\text{buffer}} - \text{Bills}_{7\text{d}})$ | Maximum price the user can safely afford to spend today. |
| $\Delta \text{Burn}$ | Daily Burn Reduction Target | INR / day | Computed ($\text{Deficit} \div \text{Days to Breach}$) | Daily discretionary reduction needed to neutralize the deficit. |

---

## 3. Mathematical Formulas & Derivations

### Formula 1: Safe-to-Swipe Decision Score ($\text{Score}_{\text{swipe}}$)

$$\text{Surplus}_{\text{sim}} = (B_t - \text{Tx}_{\text{sim}}) - S_{\text{buffer}} - \text{Bills}_{7\text{d}}$$

$$\text{Score}_{\text{swipe}} = \text{clamp}\left(0, 100, \; 50 + \left(\frac{\text{Surplus}_{\text{sim}}}{S_{\text{buffer}} + 1}\right) \times 50 - \Delta R_{\text{shortfall}}\right)$$

Where:
* $\text{clamp}(0, 100, x) = \min(100, \max(0, x))$
* $+1$ in denominator prevents division by zero when $S_{\text{buffer}} = 0$.
* If $\text{Surplus}_{\text{sim}} \ge S_{\text{buffer}}$ and $\Delta R_{\text{shortfall}} = 0$, $\text{Score}_{\text{swipe}} = 100$ (Optimal Headroom).
* If $\text{Surplus}_{\text{sim}} = 0$ and $\Delta R_{\text{shortfall}} = 0$, $\text{Score}_{\text{swipe}} = 50$ (Breakeven / Freeze Discretionary).
* If $\text{Surplus}_{\text{sim}} < 0$, the penalty scales proportionally, dropping into high-risk zone.

#### Decision Tiers:
| Score Range | Verdict Code | Visual Theme | User Advice |
| :---: | :---: | :---: | :--- |
| **85 – 100** | `SAFE_TO_SWIPE` | 🟢 Emerald Green | "Zero risk. Your Safe-to-Spend absorbs this purchase with surplus remaining." |
| **50 – 84** | `PROCEED_WITH_CAUTION` | 🟡 Amber Yellow | "Safe-to-Spend drops to ₹0. Discretionary spending must freeze for the next few days." |
| **0 – 49** | `CRITICAL_SHORTFALL_RISK` | 🔴 Crimson Red | "CRITICAL BREACH: This purchase will trigger a safety buffer violation before month end." |

---

### Formula 2: Dual-Timeline Counterfactual Trajectory ($B_{\text{sim}}(t)$)

For each future day $t \in \{1, 2, \dots, 14\}$:

$$B_{\text{base}}(t) = B_{\text{base}}(t-1) + \text{Inflow}(t) - \text{FixedExpense}(t) - \text{Burn}_{\text{disc}}$$

$$B_{\text{sim}}(t) = B_{\text{base}}(t) - \text{Tx}_{\text{sim}} \cdot \mathbb{I}(t \ge t_{\text{sim}})$$

Where:
* $\mathbb{I}(t \ge t_{\text{sim}})$ is the indicator function ($= 1$ for all days following purchase).
* $B_{\text{base}}(0) = B_t$ (Current real net balance).

#### Simulated Deficit & Breach Date:
$$\text{Deficit}_{\text{sim}}(t) = \max\left(0, \; S_{\text{buffer}} - B_{\text{sim}}(t)\right)$$

$$\text{Day}_{\text{breach}} = \min \left\{ t \in \{1 \dots 14\} \;\middle|\; B_{\text{sim}}(t) < S_{\text{buffer}} \right\}$$

If no day breaches the safety buffer, $\text{Day}_{\text{breach}} = \infty$ (No breach predicted).

---

### Formula 3: Smart Compromise & Time-Shift Threshold ($T_{\text{delay}}$ & $C_{\text{safe}}$)

When a proposed purchase triggers high risk ($\text{Score}_{\text{swipe}} < 50$), the system algorithmically calculates three viable compromises:

#### 1. Time-Shift Delay ($T_{\text{delay}}$):
Calculates the exact future date when scheduled cash inflows (e.g. stipend, salary, freelance invoice) make the purchase safe:

$$T_{\text{delay}} = \min \left\{ t \in \{1 \dots 14\} \;\middle|\; B_{\text{base}}(t) + \text{Inflow}(t) - \text{Tx}_{\text{sim}} \ge S_{\text{buffer}} \right\}$$

#### 2. Safe Price Ceiling ($C_{\text{safe}}$):
Calculates the maximum amount the user can spend *today* without breaching the safety buffer:

$$C_{\text{safe}} = \max\left(0, \; B_t - S_{\text{buffer}} - \text{Bills}_{7\text{d}}\right)$$

#### 3. Daily Discretionary Burn Reduction ($\Delta \text{Burn}$):
If the user cannot delay the purchase, this calculates the required reduction in daily non-essential burn to absorb the deficit:

$$\Delta \text{Burn} = \frac{\max_{t} \text{Deficit}_{\text{sim}}(t)}{\text{Day}_{\text{breach}}}$$

---

## 4. User Explanation Guide: How to Explain These Metrics Simply

To ensure college students and young professionals understand these metrics without financial jargon:

### 1. Explaining "Safe-to-Swipe Score" to a User:
> *"Think of your Safe-to-Swipe score like a battery health gauge for this purchase. If it's green (85+), your bank balance has plenty of charge left after buying this. If it's red (below 50), buying this item drains your battery so low that you won't have enough power left to pay your upcoming rent or mess fees."*

### 2. Explaining "Dual Timeline Chart" to a User:
> *"The blue line is your current path — what your money looks like over the next two weeks if you don't buy this item. The dotted line is the alternate reality — what happens if you spend the money right now. The red dashed line is your emergency safety buffer. The moment the dotted line dips below the red line, that's the exact day you go into the danger zone."*

### 3. Explaining "Smart Compromise" to a User:
> *"Instead of just telling you 'No', SPECIFY tells you how to make it work. If you wait 5 days until your stipend arrives, your risk drops to zero. Or if you need it today, look for an option under ₹2,100 to keep your safety buffer completely protected."*

---

## 5. Mathematical Guardrails & Edge Cases

| Edge Case Scenario | Condition | System Fallback & Protection |
| :--- | :--- | :--- |
| **Zero Safety Buffer** | $S_{\text{buffer}} = 0$ | Denominator uses $(S_{\text{buffer}} + 1.0)$ to prevent division by zero. |
| **Initial Balance Below Buffer** | $B_t < S_{\text{buffer}}$ | $\text{Surplus}_{\text{sim}} < 0$, $\text{Score}_{\text{swipe}}$ automatically clamped to 0–15. Verdict is immediately `CRITICAL_SHORTFALL_RISK`. |
| **No Inflow in 14-Day Window** | No $\text{Inflow}(t)$ recorded | $T_{\text{delay}}$ returns `"Requires fresh income deposit"`; system emphasizes the Safe Price Ceiling ($C_{\text{safe}}$) and daily burn reduction. |
| **Negative Simulated Balance** | $B_{\text{sim}}(t) < 0$ | Max deficit accurately reflects total debt ($\lvert B_{\text{sim}}(t) \rvert + S_{\text{buffer}}$). Warning advises complete discretionary freeze. |
| **Non-Discretionary Categorization** | Expense is Rent/Hostel/Mess | System flags item as protected fixed commitment rather than elective discretionary spend. |

---

## 6. Integration in "Matrix Explanation" UI Component

All three core formulas are registered in [`src/components/dashboard/MatrixExplanation.jsx`](file:///d:/projects/HackRonyX_2.0_Ray/src/components/dashboard/MatrixExplanation.jsx) under the category **`What-If Pre-Purchase Simulation`**:

1. **`safe-to-swipe-score`** (`Sparkles` icon): Explains formula, terms, clamp boundaries, and green/amber/red tiers.
2. **`counterfactual-trajectory`** (`GitBranch` icon): Explains dual-timeline balance projection, step-function deduction, and buffer floor collision.
3. **`smart-compromise`** (`Sliders` icon): Explains time-shift equation $T_{\text{delay}}$, safe price ceiling $C_{\text{safe}}$, and discretionary burn reduction rate.

Users can open the **Matrix Explanation** tab on their dashboard anytime, click the **"What-If Pre-Purchase Simulation"** filter pill, and review these exact formulas with concrete numeric examples.
