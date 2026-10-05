# BudgetNest 💠

BudgetNest is a modern full-stack personal finance tracker for managing income, expenses, savings, and transaction history.

## 🚀 Current Status

**Day 4 completed.**

BudgetNest now uses real PostgreSQL persistence for user accounts and financial transactions. The dashboard calculates income, expenses, and savings from the logged-in user's data.

## ✨ Features

- User registration and login
- JWT-based authentication
- Protected frontend and backend routes
- Secure password hashing with bcryptj- Forgot-password and email-based reset flow
- Expiring password reset tokens
- Live monthly income, expense, and savings
- Add income and expense transactions
- Edit existing transactions
- Delete transactions with confirmation
- Transaction history
- All / Income / Expenses filters
- Category-spending summary
- JPY and BDT-ready currency formatting
- User-specific financial data isolation

## 📦 Tech Stack

**Frontend**
- React
- Vite
- React Router
- JavaScript
- CSS

**Backend**
- Node.js
- Express
- REST API
- JWT
- bcryptjs
- Resend

**Database**
- PostgreSQL
- PSL migrations
- pg connection pool

## 🔥 API Overview

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

### Transactions

| method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/transactions` | Get user's transactions |
| GET | `/api/transactions/summary` | Get monthly summary |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

## 🔑 security

- Passwords are hashed before storage.
- API routes are protected with JWT authentication.
- Transaction queries are scoped to the authenticated user.
- Password reset tokens are hashed and expire.

## 🗄️ Database

BudgetNest currently uses three main PostgreSQL tables:

- `users` — accounts, country and currency preferences
- `transactions` — user-owned income and expense records
- `budgets` — monthly budget data for the upcoming budget feature

## 🛠️ Local Development

Backend:

    cd backend
    npm install
    npm run dev

Frontend in another terminal:

    cd frontend
    npm install
    npm run dev

The backend runs on port `3000` and the Vite frontend runs on port `5173` by default.

## 🗺️ Development Progress

| Stage | Status | Main Work |
|---|---|---|
| Day 1 | ✅ Completed | Project foundation and PostgreSQL setup |
| Day 2 | ✅ Completed | Application UI and authentication |
| Day 3 | ✅ Completed | Password recovery and email reset |
| Day 4 | ✅ Completed | Transaction CRUD, live dashboard and transaction history |
| Day 5 | ⏳ Next | Monthly budget management |
| Later | 📋 Planned | Reports, analytics and charts |
| Later | 📋 Planned | AWS deployment and CI/CD |

## 🎯 Engineering Goals

BudgetNest is being built to demonstrate practical experience with:

- Full-stack application development
- REST API design
- Authentication and authorization
- PostgreSQL database design
- User-level data isolation
- React frontend development
- Frontend/backend integration
- Cloud-ready application architecture

## 👤 Author

**Naiem Naimur Rahman**  
Japan

Cloud / Infrastructure / AWS focused engineer building practical projects to strengthen cloud and software engineering experience.

## ✅ MVP Status

BudgetNest MVP includes:

- User registration and login
- JWT-protected authentication
- Forgot/reset password by email
- Multi-user data isolation
- Income and expense tracking
- Create, view, edit, and delete transactions
- Live dashboard financial summary
- Monthly budget management
- Budget progress and remaining balance
- Monthly reports and category breakdown
- PostgreSQL database integration
- Responsive React frontend

## 🛠 Tech Stack

- React + Vite
- Node.js + Express
- PostgreSQL
- JWT authentication
- Resend email API
