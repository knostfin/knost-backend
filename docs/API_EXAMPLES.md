# Knost API - Request/Response Examples

Quick reference with curl commands and expected responses for all major endpoints.

---

## Authentication APIs

### 1. Register New User

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "phone": "+919876543210"
  }'
```

**Response (201):**
```json
{
  "message": "Account created successfully",
  "user": {
    "id": "uuid-here",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "email_verified": false
  }
}
```

---

### 2. Login

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Response (200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "phone": "+919876543210"
  }
}
```

---

### 3. Verify Token

**Request:**
```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "message": "Token valid",
  "user": {
    "id": "uuid-here",
    "email": "john@example.com"
  }
}
```

---

## Loans APIs

### 4. Create Loan (with EMI calculation)

**Request:**
```bash
curl -X POST http://localhost:5000/api/loans \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loan_name": "Home Loan",
    "principal_amount": 5000000,
    "interest_rate": 6.5,
    "tenure_months": 240,
    "start_date": "2025-12-01",
    "notes": "Purchased apartment"
  }'
```

**Response (201):**
```json
{
  "message": "Loan added successfully with payment schedule",
  "loan": {
    "id": "uuid-here",
    "user_id": "uuid-here",
    "loan_name": "Home Loan",
    "principal_amount": 5000000,
    "interest_rate": 6.5,
    "tenure_months": 240,
    "emi_amount": "32662.47",
    "start_date": "2025-12-01",
    "end_date": "2045-12-01",
    "status": "active",
    "created_at": "2025-12-18T10:30:00Z"
  }
}
```

---

### 5. Get All Loans

**Request:**
```bash
curl -X GET http://localhost:5000/api/loans \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "loans": [
    {
      "id": "uuid-here",
      "loan_name": "Home Loan",
      "principal_amount": 5000000,
      "emi_amount": "32662.47",
      "status": "active",
      "payment_summary": {
        "total_payments": 240,
        "paid_count": 3,
        "pending_count": 237,
        "overdue_count": 0,
        "total_paid": "97987.41"
      }
    }
  ]
}
```

---

### 6. Get Loan Details with Payment Schedule

**Request:**
```bash
curl -X GET http://localhost:5000/api/loans/uuid-here \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "loan": {
    "id": "uuid-here",
    "loan_name": "Home Loan",
    "principal_amount": 5000000,
    "emi_amount": "32662.47",
    "status": "active",
    "start_date": "2025-12-01",
    "end_date": "2045-12-01"
  },
  "payments": [
    {
      "id": "uuid-here",
      "payment_number": 1,
      "payment_date": "2026-01-01",
      "emi_amount": 32662.47,
      "principal_paid": "5162.47",
      "interest_paid": "27500.00",
      "outstanding_balance": "4994837.53",
      "status": "pending"
    },
    {
      "id": "uuid-here",
      "payment_number": 2,
      "payment_date": "2026-02-01",
      "emi_amount": 32662.47,
      "principal_paid": "5181.33",
      "interest_paid": "27481.14",
      "outstanding_balance": "4989656.20",
      "status": "paid",
      "paid_on": "2026-02-01T09:15:00Z"
    }
  ]
}
```

---

### 7. Mark EMI as Paid

**Request:**
```bash
curl -X POST http://localhost:5000/api/loans/uuid-here/payments/payment-uuid/mark-paid \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "message": "EMI marked as paid",
  "payment": {
    "id": "payment-uuid",
    "payment_number": 3,
    "payment_date": "2026-03-01",
    "emi_amount": 32662.47,
    "status": "paid",
    "paid_on": "2025-12-18T14:22:00Z"
  }
}
```

---

## Expenses APIs

### 8. Create Recurring Expense Template

**Request:**
```bash
curl -X POST http://localhost:5000/api/expenses/recurring \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Electricity Bill",
    "amount": 2500,
    "description": "Monthly electricity bill",
    "payment_method": "bank_transfer",
    "start_month": "2025-12-01",
    "due_day": 15
  }'
```

**Response (201):**
```json
{
  "message": "Recurring expense added successfully",
  "expense": {
    "id": "uuid-here",
    "category": "Electricity Bill",
    "amount": 2500,
    "payment_method": "bank_transfer",
    "start_month": "2025-12-01",
    "due_day": 15,
    "is_active": true,
    "created_at": "2025-12-18T10:30:00Z"
  }
}
```

---

### 9. Generate Monthly Expenses from Recurring Templates

**Request:**
```bash
curl -X POST http://localhost:5000/api/expenses/generate/2025-12 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (201):**
```json
{
  "message": "5 monthly expenses generated successfully",
  "expenses": [
    {
      "id": "uuid-here",
      "category": "Electricity Bill",
      "amount": 2500,
      "month_year": "2025-12",
      "due_date": "2025-12-15",
      "status": "pending",
      "recurring_expense_id": "recurring-uuid"
    },
    {
      "id": "uuid-here",
      "category": "Internet Bill",
      "amount": 1500,
      "month_year": "2025-12",
      "due_date": "2025-12-10",
      "status": "pending",
      "recurring_expense_id": "recurring-uuid"
    }
  ]
}
```

---

### 10. Get Monthly Expenses with Summary

**Request:**
```bash
curl -X GET "http://localhost:5000/api/expenses/monthly?month_year=2025-12" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "expenses": [
    {
      "id": "uuid-here",
      "category": "Electricity Bill",
      "amount": 2500,
      "month_year": "2025-12",
      "due_date": "2025-12-15",
      "status": "pending"
    },
    {
      "id": "uuid-here",
      "category": "Groceries",
      "amount": 5000,
      "month_year": "2025-12",
      "due_date": "2025-12-20",
      "status": "paid",
      "paid_on": "2025-12-20T18:30:00Z"
    }
  ],
  "summary": {
    "total_expenses": 2,
    "pending": 1,
    "paid": 1,
    "total_amount": 7500,
    "paid_amount": 5000,
    "pending_amount": 2500
  }
}
```

---

### 11. Mark Expense as Paid

**Request:**
```bash
curl -X POST http://localhost:5000/api/expenses/monthly/uuid-here/mark-paid \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "message": "Expense marked as paid",
  "expense": {
    "id": "uuid-here",
    "category": "Electricity Bill",
    "amount": 2500,
    "status": "paid",
    "paid_on": "2025-12-18T15:45:00Z"
  }
}
```

---

## Debts APIs

### 12. Create Debt

**Request:**
```bash
curl -X POST http://localhost:5000/api/debts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "debt_name": "Car Loan",
    "total_amount": 800000,
    "creditor": "HDFC Bank",
    "due_date": "2026-12-31",
    "notes": "Car purchased in 2023"
  }'
```

**Response (201):**
```json
{
  "message": "Debt added successfully",
  "debt": {
    "id": "uuid-here",
    "debt_name": "Car Loan",
    "total_amount": 800000,
    "amount_paid": 0,
    "creditor": "HDFC Bank",
    "due_date": "2026-12-31",
    "status": "pending",
    "created_at": "2025-12-18T10:30:00Z"
  }
}
```

---

### 13. Pay Debt Partially

**Request:**
```bash
curl -X POST http://localhost:5000/api/debts/uuid-here/pay \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000
  }'
```

**Response (200):**
```json
{
  "message": "Debt payment recorded successfully",
  "debt": {
    "id": "uuid-here",
    "debt_name": "Car Loan",
    "total_amount": 800000,
    "amount_paid": 100000,
    "status": "partially_paid",
    "remaining_amount": 700000
  }
}
```

---

## Income APIs

### 14. Add Income

**Request:**
```bash
curl -X POST http://localhost:5000/api/income \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "Monthly Salary",
    "amount": 75000,
    "description": "December salary",
    "month_year": "2025-12",
    "received_on": "2025-12-01"
  }'
```

**Response (201):**
```json
{
  "message": "Income added successfully",
  "income": {
    "id": "uuid-here",
    "source": "Monthly Salary",
    "amount": 75000,
    "month_year": "2025-12",
    "received_on": "2025-12-01",
    "created_at": "2025-12-18T10:30:00Z"
  }
}
```

---

### 15. Get Income for Month

**Request:**
```bash
curl -X GET "http://localhost:5000/api/income?month_year=2025-12" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "income": [
    {
      "id": "uuid-here",
      "source": "Monthly Salary",
      "amount": 75000,
      "month_year": "2025-12",
      "received_on": "2025-12-01"
    },
    {
      "id": "uuid-here",
      "source": "Freelance Project",
      "amount": 25000,
      "month_year": "2025-12",
      "received_on": "2025-12-15"
    }
  ],
  "summary": {
    "total_income": 100000,
    "count": 2
  }
}
```

---

## Investments APIs

### 16. Create Investment

**Request:**
```bash
curl -X POST http://localhost:5000/api/investments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "investment_type": "mutual_fund",
    "name": "Axis Growth Fund",
    "amount": 50000,
    "invested_on": "2025-12-01",
    "maturity_date": "2030-12-01",
    "notes": "SIP investment"
  }'
```

**Response (201):**
```json
{
  "message": "Investment added successfully",
  "investment": {
    "id": "uuid-here",
    "investment_type": "mutual_fund",
    "name": "Axis Growth Fund",
    "amount": 50000,
    "invested_on": "2025-12-01",
    "maturity_date": "2030-12-01",
    "status": "active",
    "created_at": "2025-12-18T10:30:00Z"
  }
}
```

---

### 17. Get All Investments with Summary

**Request:**
```bash
curl -X GET http://localhost:5000/api/investments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "investments": [
    {
      "id": "uuid-here",
      "investment_type": "mutual_fund",
      "name": "Axis Growth Fund",
      "amount": 50000,
      "current_value": 55000,
      "returns": 5000,
      "status": "active"
    }
  ],
  "summary": {
    "total_investments": 1,
    "total_invested": 50000,
    "current_value": 55000,
    "total_returns": 5000,
    "active": 1,
    "matured": 0
  }
}
```

---

## Dashboard APIs

### 18. Get Monthly Overview

**Request:**
```bash
curl -X GET http://localhost:5000/api/dashboard/monthly/2025-12 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "month_year": "2025-12",
  "total_income": 100000,
  "total_expenses": 15000,
  "total_debt_paid": 25000,
  "net_balance": 60000,
  "expense_breakdown": {
    "Electricity Bill": 2500,
    "Groceries": 5000,
    "Transportation": 3500,
    "Dining": 4000
  },
  "income_breakdown": {
    "Monthly Salary": 75000,
    "Freelance": 25000
  },
  "upcoming_payments": [
    {
      "date": "2025-12-25",
      "type": "expense",
      "category": "Insurance",
      "amount": 3000
    }
  ]
}
```

---

### 19. Get Multi-Month Comparison

**Request:**
```bash
curl -X GET "http://localhost:5000/api/dashboard/range?start_month=2025-10&end_month=2025-12" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "data": [
    {
      "month": "2025-10",
      "income": 95000,
      "expenses": 14000,
      "net": 81000
    },
    {
      "month": "2025-11",
      "income": 100000,
      "expenses": 16000,
      "net": 84000
    },
    {
      "month": "2025-12",
      "income": 100000,
      "expenses": 15000,
      "net": 85000
    }
  ],
  "summary": {
    "total_income": 295000,
    "total_expenses": 45000,
    "average_income": 98333.33,
    "average_expenses": 15000
  }
}
```

---

## Categories APIs

### 20. Create/Update Category

**Request:**
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Groceries",
    "type": "expense",
    "icon": "🛒"
  }'
```

**Response (201):**
```json
{
  "message": "Category saved",
  "category": {
    "id": "uuid-here",
    "user_id": "uuid-here",
    "name": "Groceries",
    "type": "expense",
    "icon": "🛒",
    "created_at": "2025-12-18T10:30:00Z"
  }
}
```

---

### 21. Get Categories

**Request:**
```bash
curl -X GET "http://localhost:5000/api/categories?type=expense" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response (200):**
```json
{
  "categories": [
    {
      "id": "uuid-here",
      "name": "Groceries",
      "type": "expense",
      "icon": "🛒"
    },
    {
      "id": "uuid-here",
      "name": "Utilities",
      "type": "expense",
      "icon": "💡"
    }
  ]
}
```

---

## Error Examples

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "details": "Invalid or missing authentication token"
}
```

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": "Amount must be greater than 0"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "details": "Loan with ID xyz not found"
}
```

### 500 Server Error
```json
{
  "error": "Server error",
  "details": "An unexpected error occurred"
}
```

---

## Testing in Postman

1. Import the Swagger spec: `http://localhost:5000/api-docs.json`
2. Create new environment with variable: `token` = access token from login
3. Set Bearer token: `{{token}}`
4. Use provided request collections

---

**Last Updated:** December 18, 2025  
**API Version:** 1.0.0
