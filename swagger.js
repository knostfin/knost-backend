const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Knost API",
      version: "1.0.0",
      description: "Comprehensive backend APIs for Knost personal finance management application",
      contact: {
        name: "Knost Support",
        url: "https://knost.in",
      },
    },
    servers: [
      { url: "https://api.knost.in", description: "Production" },
      { url: "https://api-dev.knost.in", description: "Development" },
      { url: "http://localhost:5000", description: "Local Development" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token from login endpoint",
        },
      },
      schemas: {
        // ==================== AUTH SCHEMAS ====================
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            firstname: { type: "string" },
            lastname: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            avatar: { type: "string", format: "uri" },
            email_verified: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        // ==================== FINANCE SCHEMAS ====================
        Transaction: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["income", "expense", "debt"] },
            category: { type: "string" },
            amount: { type: "number", format: "float" },
            description: { type: "string" },
            date: { type: "string", format: "date" },
            paymentMethod: { type: "string", enum: ["cash", "card", "bank_transfer", "upi", "other"] },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        // ==================== LOANS SCHEMAS ====================
        Loan: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            loan_name: { type: "string" },
            principal_amount: { type: "number", format: "float" },
            interest_rate: { type: "number", format: "float", description: "Annual interest rate in %" },
            tenure_months: { type: "integer" },
            emi_amount: { type: "number", format: "float", description: "Monthly EMI amount" },
            start_date: { type: "string", format: "date" },
            end_date: { type: "string", format: "date" },
            notes: { type: "string" },
            status: { type: "string", enum: ["active", "closed", "foreclosed"] },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        LoanPayment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            loan_id: { type: "string", format: "uuid" },
            payment_number: { type: "integer" },
            payment_date: { type: "string", format: "date" },
            emi_amount: { type: "number", format: "float" },
            principal_paid: { type: "number", format: "float" },
            interest_paid: { type: "number", format: "float" },
            outstanding_balance: { type: "number", format: "float" },
            status: { type: "string", enum: ["pending", "paid", "overdue"] },
            paid_on: { type: "string", format: "date-time", nullable: true },
          },
        },

        // ==================== DEBTS SCHEMAS ====================
        Debt: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            debt_name: { type: "string" },
            total_amount: { type: "number", format: "float" },
            amount_paid: { type: "number", format: "float", default: 0 },
            creditor: { type: "string" },
            due_date: { type: "string", format: "date", nullable: true },
            notes: { type: "string" },
            status: { type: "string", enum: ["pending", "partially_paid", "paid"] },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        // ==================== EXPENSES SCHEMAS ====================
        RecurringExpense: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            category: { type: "string" },
            amount: { type: "number", format: "float" },
            description: { type: "string" },
            payment_method: { type: "string", enum: ["cash", "card", "bank_transfer", "upi", "other"] },
            start_month: { type: "string", format: "date", description: "Format: YYYY-MM-01" },
            end_month: { type: "string", format: "date", nullable: true, description: "Format: YYYY-MM-01" },
            due_day: { type: "integer", minimum: 1, maximum: 31 },
            is_active: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        MonthlyExpense: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            category: { type: "string" },
            amount: { type: "number", format: "float" },
            description: { type: "string" },
            payment_method: { type: "string", enum: ["cash", "card", "bank_transfer", "upi", "other"] },
            month_year: { type: "string", format: "date", description: "Format: YYYY-MM" },
            due_date: { type: "string", format: "date" },
            status: { type: "string", enum: ["pending", "paid"] },
            paid_on: { type: "string", format: "date-time", nullable: true },
            recurring_expense_id: { type: "string", format: "uuid", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        // ==================== INCOME SCHEMAS ====================
        Income: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            source: { type: "string", description: "Income source (salary, freelance, investment return, etc.)" },
            amount: { type: "number", format: "float" },
            description: { type: "string" },
            month_year: { type: "string", format: "date", description: "Format: YYYY-MM" },
            received_on: { type: "string", format: "date" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        // ==================== INVESTMENTS SCHEMAS ====================
        Investment: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            investment_type: { 
              type: "string", 
              enum: ["mutual_fund", "stocks", "savings", "fd", "ppf", "gold", "real_estate", "crypto", "other"]
            },
            name: { type: "string", description: "Investment name/description" },
            amount: { type: "number", format: "float", description: "Invested amount" },
            current_value: { type: "number", format: "float", nullable: true },
            returns: { type: "number", format: "float", nullable: true, description: "Current profit/loss" },
            invested_on: { type: "string", format: "date" },
            maturity_date: { type: "string", format: "date", nullable: true },
            notes: { type: "string" },
            status: { type: "string", enum: ["active", "matured", "sold"] },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        // ==================== CATEGORY SCHEMAS ====================
        Category: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            name: { type: "string" },
            type: { type: "string", enum: ["income", "expense", "debt"] },
            icon: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },

        // ==================== DASHBOARD SCHEMAS ====================
        MonthlyOverview: {
          type: "object",
          properties: {
            month_year: { type: "string", description: "Format: YYYY-MM" },
            total_income: { type: "number", format: "float" },
            total_expenses: { type: "number", format: "float" },
            total_debt_paid: { type: "number", format: "float" },
            net_balance: { type: "number", format: "float" },
            expense_breakdown: {
              type: "object",
              additionalProperties: { type: "number", format: "float" },
            },
            income_breakdown: {
              type: "object",
              additionalProperties: { type: "number", format: "float" },
            },
            upcoming_payments: { type: "array", items: { type: "object" } },
          },
        },

        // ==================== ERROR SCHEMAS ====================
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            details: { type: "string" },
            code: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);