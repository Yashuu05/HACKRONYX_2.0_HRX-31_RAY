# AI Cashflow Guardian

> A proactive, explainable personal cash-flow intelligence agent for students and young professionals.

Cashflow Guardian answers the question traditional budgeting tools leave unanswered:

> **Considering upcoming income and expenses, how much can I safely spend today?**

This repository contains the HackRonyx 2.0 / R2-P4 prototype. It demonstrates a complete Observe -> Predict -> Explain -> Intervene -> Learn -> Re-plan loop using simulated financial data, deterministic liquidity calculations, a FastAPI service, PostgreSQL-compatible persistence, and a React dashboard.

## Product At A Glance

Cashflow Guardian continuously evaluates a user's near-term liquidity rather than only reporting historical spending. It combines:

- 7-14 day balance trajectory forecasting
- Dynamic Safe-to-Spend calculation
- Protected commitments and configurable safety buffer
- Shortfall risk scoring, causes, and mitigation strategies
- Natural-language transaction capture and categorization
- Explainable AI chat grounded in database-derived metrics
- Accept, reject, and modify feedback for recommendation learning
- A judge-ready scenario timeline for demonstrating two learning cycles

## Problem And Solution

Students, interns, and young professionals often receive irregular income from salaries, stipends, freelance work, and family transfers while still carrying recurring and unexpected expenses. Most financial applications explain what has already happened; they do not protect the user's future liquidity.

Cashflow Guardian projects the user's financial position over the next 7-14 days, protects essential commitments, reserves a safety buffer, explains emerging risk, and recommends a practical next action. It is a personal liquidity management tool, not a banking, lending, investment, credit-scoring, or money-movement product.

## Core Intelligence Loop

1. **Observe** - Read transactions, account constants, categories, dates, statuses, and user feedback.
2. **Predict** - Project daily balances, scheduled income, expenses, confidence ranges, and buffer breaches.
3. **Explain** - Attribute risk to concrete events such as delayed income, recurring bills, or unusual expenses.
4. **Intervene** - Recommend spend caps, deferred discretionary purchases, or other protective actions.
5. **Learn** - Record whether a recommendation was accepted, rejected, or modified.
6. **Re-plan** - Recalculate the user's safe limit and future recommendations after new data or feedback.

## Current User Experience

The React application provides:

- Product landing page explaining the value proposition and guardrails
- Interactive Safe-to-Spend visualizer
- 7-day and 14-day forecast views with expected, best-case, and worst-case ranges
- Dashboard overview with balance, income, expense, and Safe-to-Spend metrics
- Shortfall Risk Detection card with severity, score, days to shortfall, deficit, causes, and actions
- Transaction list, filtering, search, CSV export, and add-transaction flow
- Analytics view for categories, trends, merchants, ratios, and day-of-week patterns
- AI Guardian chat for affordability, spending, savings, and ledger questions
- Settings for profile, budget, safety buffer, and account actions
- Eight-step live demonstration timeline and continuous-learning proof
- Judge Sandbox for testing the intended scenario during evaluation

## Technical Architecture

```mermaid
flowchart LR
	UI[React + Vite UI] --> API[FastAPI API]
	API --> DB[(PostgreSQL / Neon)]
	API --> Engine[Deterministic Liquidity Engine]
	API --> NLP[Transaction Categorization]
	API --> LC[LangChain Agent]
	LC --> Tools[Grounded Financial Tools]
	Tools --> DB
	LC --> LLM[Optional LLM Explainability]
	Engine --> Risk[Shortfall Reasoning + Mitigation]
	Risk --> UI
```

### Frontend

- React 18
- Vite
- Lucide React icons
- Component-based landing page and dashboard
- Local demo data fallback when the API or database is unavailable

### Backend

- FastAPI service in `main.py`
- PostgreSQL access through `psycopg2`
- Deterministic shortfall engine in `backend/shortfall_detection/`
- Rule-based mitigation and causal reasoning
- LangChain tools and orchestration in `backend/ai_agent/`
- Keyword transaction extraction with an optional LLM fallback

### Data Layer

The planned relational model is documented in [data_model.md](data_model.md). It includes users, transactions, alerts, AI chats, forecasts, and AI feedback. Firebase is intended for authentication mapping, while PostgreSQL/Neon stores financial and product data.

## API Surface

The current FastAPI service exposes:

| Area | Endpoints |
| --- | --- |
| Health | `GET /` |
| Authentication | `POST /api/auth/signup`, `POST /api/auth/login` |
| Profile and constants | `GET/POST /api/users/profile`, `GET/POST /api/users/constants` |
| Transactions | `GET/POST /api/transactions`, `GET /api/transactions/recent`, `GET /api/transactions/summary` |
| Natural-language input | `POST /api/transactions/natural-language` |
| Analytics | `GET /api/analytics` |
| Shortfall analysis | `GET /api/shortfall/analysis` |
| AI feedback | `POST /api/feedback` |
| AI assistant | `POST /api/ai/chat/stream` |
| Account deletion | `DELETE /api/users/{user_id}` |

## Quick Start

### Prerequisites

- Node.js 18 or newer
- Python 3.10 or newer
- PostgreSQL or a Neon PostgreSQL connection
- Optional LLM provider configuration for AI-generated explanations

### Frontend

```powershell
npm install
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`.

### Backend

Create a `.env` file with a valid database connection:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Install Python dependencies and start FastAPI:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Initialize and seed the database using the scripts in `db/` when the database is available. The frontend expects the backend at `http://localhost:8000`.

### Production Build Check

```powershell
npm run build
```

## Demonstration Flow

The intended live demonstration follows the competition brief:

1. Start with a healthy balance and safe forecast.
2. Delay expected stipend or freelance income.
3. Add an unexpected expense such as a laptop repair.
4. Detect the projected safety-buffer breach.
5. Recalculate the forecast and Safe-to-Spend limit.
6. Explain the causal impact in plain language.
7. Present a protective action such as a daily spend cap.
8. Record the user's decision and use it in a later recommendation.

## Product Guardrails

- Numeric financial outputs are intended to come from deterministic calculations, not free-form LLM arithmetic.
- The prototype uses simulated feeds and manually entered transactions; it does not move real money.
- It does not connect to bank credentials, provide loans, score credit, recommend investments, or sell financial products.
- Production deployment would require authentication hardening, password hashing, authorization, secrets management, validation, auditability, and security review.

## Repository Guide

| Path | Purpose |
| --- | --- |
| `src/` | React application and dashboard components |
| `src/utils/mockData.js` | Demo forecast, scenario, and FAQ data |
| `main.py` | FastAPI routes and request schemas |
| `backend/shortfall_detection/` | Forecast, risk reasoning, and mitigation logic |
| `backend/ai_agent/` | LangChain tools, memory, chains, and orchestration |
| `backend/transaction_categorization/` | Natural-language transaction parsing |
| `db/` | Database connection, schema creation, and seed scripts |
| `data_model.md` | Relational data model and DDL reference |
| `Personal_Agent_architect.md` | Conversational agent architecture |
| `design/landing_page.md` | Product and UI design specification |
| `PRD.md` | Product requirements document |

## Status

This is a hackathon prototype and demonstration build. The core user journey and decision-support loop are implemented, while production hardening, robust authentication, real ingestion integrations, statistical calibration, and persistent model adaptation remain future work.

