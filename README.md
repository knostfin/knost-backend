# Knost Backend

Minimal Express + Postgres authentication service.

Getting started

1. Copy `.env.example` to `.env` and populate values.
2. Install dependencies:

```powershell
npm install
```

3. Run in development:

```powershell
npm run dev
```

Files added by maintenance patch

- `src/app.js` - exports configured Express app
- `src/config.js` - small env checker
- `src/middlewares/errorHandler.js` - central error handler
- `.env.example`, `.gitignore`, lint/test configs, Docker and CI templates

Notes and recommendations

- Run `npm run lint` and `npm run format` before committing.
- Consider using migrations (e.g., `node-pg-migrate` or `knex`) for schema management.
- For production, set `CORS_ORIGIN`, ensure `JWT_SECRET` and `REFRESH_TOKEN_SECRET` are strong and kept secret.
