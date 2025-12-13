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
	country_code varchar(10) NULL,
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

## Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (email or phone)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/verify` - Verify token validity
- `POST /api/auth/logout` - Logout (delete refresh token)

### Profile Management (requires auth)
- `PUT /api/auth/profile` - Update profile (firstname, lastname, phone)
- `POST /api/auth/profile/photo` - Upload profile photo
- `POST /api/auth/change-password` - Change password

### Password Reset (no auth required)
- `POST /api/auth/forgot-password` - Request password reset (sends email with link)
- `POST /api/auth/reset-password` - Reset password with token

### Email Verification (requires auth)
- `POST /api/auth/request-email-verify` - Request email verification token
- `POST /api/auth/verify-email` - Verify and update email

## Notes
- Photo uploads are stored in `uploads/` directory (or configure cloud storage in `uploadMiddleware.js`)
- Email verification tokens expire in 1 hour
- All protected endpoints require `Authorization: Bearer <token>` header
