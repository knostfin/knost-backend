# Database Schema

## Tables Required

### users
```sql
CREATE TABLE public.users (
	id serial4 NOT NULL,
	firstname varchar(255) NOT NULL,
	lastname varchar(255) NOT NULL,
	email varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	phone varchar(20) NULL,
	photo_filename varchar(255) NULL,
	photo_mimetype varchar(50) NULL,
	photo_size int4 NULL,
	photo_updated_at timestamp NULL,
	email_verified bool DEFAULT false NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	last_login timestamp NULL,
	photo_url text NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_phone_key UNIQUE (phone),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
```

### refresh_tokens
```sql
CREATE TABLE public.refresh_tokens (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	"token" text NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	expires_at timestamp NULL,
	CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id)
);
```

### email_verifications
```sql
CREATE TABLE public.email_verifications (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	email varchar(255) NOT NULL,
	"token" text NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	expires_at timestamp DEFAULT (now() + '01:00:00'::interval) NULL,
	CONSTRAINT email_verifications_pkey PRIMARY KEY (id),
	CONSTRAINT email_verifications_user_id_key UNIQUE (user_id)
);
```

### phone_otps
```sql
CREATE TABLE public.phone_otps (
	id serial4 NOT NULL,
	phone varchar(20) NOT NULL,
	otp varchar(6) NOT NULL,
	expires_at timestamp NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT phone_otps_pkey PRIMARY KEY (id)
);
```

### password_resets
```sql
CREATE TABLE public.password_resets (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	email varchar(255) NOT NULL,
	token text NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	expires_at timestamp DEFAULT (now() + '01:00:00'::interval) NULL,
	CONSTRAINT password_resets_pkey PRIMARY KEY (id),
	CONSTRAINT password_resets_user_id_key UNIQUE (user_id)
);
```

### Transactions Table
```sql
CREATE TABLE public.transactions (
    id serial4 NOT NULL,
    user_id int4 NOT NULL,
    type varchar(20) NOT NULL CHECK (type IN ('income', 'expense', 'debt')),
    category varchar(50) NOT NULL,
    amount numeric(15, 2) NOT NULL CHECK (amount > 0),
    description text NULL,
    transaction_date date NOT NULL DEFAULT CURRENT_DATE,
    payment_method varchar(30) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'upi', 'other')),
    created_at timestamp DEFAULT now() NULL,
    updated_at timestamp DEFAULT now() NULL,
    CONSTRAINT transactions_pkey PRIMARY KEY (id),
    CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
```

### 
```sql
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_type ON public.transactions(type);
```

### Categories Table (Optional)
```sql
CREATE TABLE public.categories (
    id serial4 NOT NULL,
    user_id int4 NOT NULL,
    name varchar(50) NOT NULL,
    type varchar(20) NOT NULL CHECK (type IN ('income', 'expense', 'debt')),
    icon varchar(10) NULL,
    created_at timestamp DEFAULT now() NULL,
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT categories_user_id_name_type_key UNIQUE (user_id, name, type)
);
```

### Budgets Table (Optional)
```sql
CREATE TABLE public.budgets (
    id serial4 NOT NULL,
    user_id int4 NOT NULL,
    category varchar(50) NOT NULL,
    amount numeric(15, 2) NOT NULL,
    period varchar(20) DEFAULT 'month' CHECK (period IN ('week', 'month', 'year')),
    created_at timestamp DEFAULT now() NULL,
    CONSTRAINT budgets_pkey PRIMARY KEY (id),
    CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT budgets_user_id_category_period_key UNIQUE (user_id, category, period)
);
```

## NEW Finance Management Tables

For complete schema details, see `FINANCE_SCHEMA.sql` which includes:
- **loans** - Loan tracking with automatic EMI calculation
- **loan_payments** - Individual EMI payment schedule and tracking
- **debts** - Debt tracking with partial payment support
- **recurring_expenses** - Templates for monthly recurring expenses
- **monthly_expenses** - Actual monthly expenses (generated from templates or one-off)
- **income** - Income tracking by month
- **investments** - Investment and savings tracking

## Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (phone format: +{countrycode}{10digits}, e.g., +919876543210)
- `POST /api/auth/login` - Login (email or phone with combined country code)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify` - Verify token validity
- `POST /api/auth/logout` - Logout (delete refresh token)

### Profile Management (requires auth)
- `PUT /api/auth/profile` - Update profile (firstname, lastname, phone with country code format)
- `POST /api/auth/profile/photo` - Upload profile photo
- `POST /api/auth/change-password` - Change password

### Password Reset (no auth required)
- `POST /api/auth/forgot-password` - Request password reset (sends email with link)
- `POST /api/auth/reset-password` - Reset password with token

### Email Verification (requires auth)
- `POST /api/auth/request-email-verify` - Request email verification token
- `POST /api/auth/verify-email` - Verify and update email

### Finance (Legacy - Keep for backward compatibility)
- `GET /api/finance/transactions` - Get transactions with filters
- `POST /api/finance/transactions` - Add transaction
- `PUT /api/finance/transactions/:id` - Update transaction
- `DELETE /api/finance/transactions/:id` - Delete transaction
- `GET /api/finance/category-breakdown` - Category breakdown
- `GET /api/finance/monthly-trend` - Monthly trend

### Loans (New)
- `POST /api/loans` - Add new loan with EMI calculation
- `GET /api/loans` - Get all loans
- `GET /api/loans/:id` - Get loan details with payment schedule
- `PUT /api/loans/:id` - Update loan
- `DELETE /api/loans/:id` - Delete loan
- `POST /api/loans/:id/close` - Close loan
- `GET /api/loans/:id/payments` - Get payment schedule
- `POST /api/loans/:id/payments/:paymentId/mark-paid` - Mark EMI as paid
- `GET /api/loans/monthly-due/list` - Get monthly EMIs due

### Debts (New)
- `POST /api/debts` - Add debt
- `GET /api/debts` - Get all debts
- `GET /api/debts/:id` - Get debt details
- `PUT /api/debts/:id` - Update debt
- `DELETE /api/debts/:id` - Delete debt
- `POST /api/debts/:id/pay` - Mark debt as paid (partial or full)
- `GET /api/debts/monthly-due/list` - Get monthly debts due

### Expenses (New)
- `POST /api/expenses/recurring` - Add recurring expense template
- `GET /api/expenses/recurring` - Get all templates
- `PUT /api/expenses/recurring/:id` - Update template
- `DELETE /api/expenses/recurring/:id` - Delete template
- `POST /api/expenses/generate/:month_year` - Generate monthly expenses from templates
- `GET /api/expenses/monthly` - Get monthly expenses
- `POST /api/expenses/monthly` - Add one-off expense
- `PUT /api/expenses/monthly/:id` - Update expense
- `DELETE /api/expenses/monthly/:id` - Delete expense
- `POST /api/expenses/monthly/:id/mark-paid` - Mark as paid
- `GET /api/expenses/categories` - Get all categories

### Income (New)
- `POST /api/income` - Add income
- `GET /api/income` - Get income (supports month_year or date range)
- `GET /api/income/:id` - Get income details
- `PUT /api/income/:id` - Update income
- `DELETE /api/income/:id` - Delete income
- `GET /api/income/sources/list` - Get all income sources

### Investments (New)
- `POST /api/investments` - Add investment
- `GET /api/investments` - Get all investments
- `GET /api/investments/:id` - Get investment details
- `PUT /api/investments/:id` - Update investment
- `DELETE /api/investments/:id` - Delete investment
- `GET /api/investments/breakdown/types` - Get breakdown by type

### Dashboard (New)
- `GET /api/dashboard/monthly/:month_year` - Complete monthly overview
- `GET /api/dashboard/range` - Multi-month comparison
- `GET /api/dashboard/status/:month_year` - Month status (cleared/pending)
- `GET /api/dashboard/transactions/:month_year` - All transactions for month
- `GET /api/dashboard/year/:year` - Yearly summary

## Notes
- Photo uploads are stored in `uploads/` directory (or configure cloud storage in `uploadMiddleware.js`)
- Email verification tokens expire in 1 hour
- All protected endpoints require `Authorization: Bearer <token>` header
- Run `FINANCE_SCHEMA.sql` to create all new finance management tables
- Month format: YYYY-MM (e.g., 2025-12)
- Date format: YYYY-MM-DD
