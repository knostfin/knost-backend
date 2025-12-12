# Multi-Domain Deployment Setup

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ GoDaddy Domain: knost.in                                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ api.knost.in  ─────────→  Render Production Backend     │
│                           (NODE_ENV=production)          │
│                                                           │
│ api-dev.knost.in  ──────→  Local Machine / Dev Server   │
│                           (NODE_ENV=development)         │
│                                                           │
│ knost.in & www.knost.in ─→ Frontend (Vercel/Netlify)    │
└─────────────────────────────────────────────────────────┘
```

## 1. GoDaddy DNS Configuration

### A. Production Subdomain (api.knost.in)

1. Go to **GoDaddy Dashboard** → **Manage DNS**
2. Add **DNS A Record** for `api`:
   - **Name**: `api`
   - **Type**: `A`
   - **Value**: `<Your Render backend IP or CNAME>`
   - **TTL**: `3600` (1 hour)

   OR use **CNAME** if Render provides one:
   - **Name**: `api`
   - **Type**: `CNAME`
   - **Value**: `<your-render-app>.onrender.com`
   - **TTL**: `3600`

### B. Development Subdomain (api-dev.knost.in)

1. Add another **DNS A Record** for `api-dev`:
   - **Name**: `api-dev`
   - **Type**: `A`
   - **Value**: `<Your local IP or VPN IP>`
   - **TTL**: `300` (5 minutes - for quick updates)

   **Option 1: Static IP (Recommended)**
   ```
   If your ISP gives you a static IP, use it directly
   ```

   **Option 2: Dynamic DNS**
   ```
   If your IP changes, use a service like Cloudflare or Duck DNS
   ```

   **Option 3: ngrok (Tunnel)**
   ```
   ngrok http 5000
   # Get ngrok URL and point dns-api-dev to it
   ```

## 2. Backend Environment Variables

### Development Machine (.env)
```env
NODE_ENV=development
DATABASE_HOST=ep-billowing-shadow-aehb0g6j-pooler.c-2.us-east-2.aws.neon.tech
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE=neondb
DATABASE_PORT=5432

JWT_SECRET=dev_secret_key
REFRESH_TOKEN_SECRET=dev_refresh_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Point to dev subdomain for CORS
DEV_DOMAIN=api-dev.knost.in

RESEND_API_KEY=your_resend_key
```

### Render Production (.env in Render)
1. Go to **Render Dashboard** → Your App → **Environment**
2. Add these variables:
   ```
   NODE_ENV=production
   DATABASE_HOST=ep-billowing-shadow-aehb0g6j-pooler.c-2.us-east-2.aws.neon.tech
   DATABASE_USERNAME=<from Neon>
   DATABASE_PASSWORD=<from Neon>
   DATABASE=neondb
   DATABASE_PORT=5432

   JWT_SECRET=<your_production_secret>
   REFRESH_TOKEN_SECRET=<your_production_refresh_secret>
   JWT_EXPIRES_IN=15m
   REFRESH_TOKEN_EXPIRES_IN=7d

   RESEND_API_KEY=your_resend_key
   REDIS_ENABLED=true
   REDIS_HOST=<your_redis_host>
   REDIS_PORT=6379
   REDIS_PASSWORD=<your_redis_password>
   ```

## 3. SSL/HTTPS Certificates

### Auto-SSL via GoDaddy
1. GoDaddy typically auto-enables SSL for custom domains
2. Verify: Visit `https://api.knost.in` (should work)

### For Local Development (api-dev.knost.in)
If you want HTTPS locally:

**Option A: Self-Signed Certificate**
```bash
# Generate certificate
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# Update backend to use HTTPS
const https = require('https');
const fs = require('fs');
const app = require('./src/app');

const options = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

https.createServer(options, app).listen(5000);
```

**Option B: Use mkcert**
```bash
# Install mkcert
mkcert -install
mkcert api-dev.knost.in

# Use generated certificates
```

**Option C: Cloudflare Tunnel (Easiest)**
```bash
# Install cloudflare tunnel
cloudflared tunnel --url https://localhost:5000 --hostname api-dev.knost.in
```

## 4. Frontend Configuration

### Development (Using api-dev.knost.in)
**.env.local**
```env
VITE_API_URL=https://api-dev.knost.in
REACT_APP_API_URL=https://api-dev.knost.in
```

### Production (Using api.knost.in)
**.env.production**
```env
VITE_API_URL=https://api.knost.in
REACT_APP_API_URL=https://api.knost.in
```

## 5. CORS Automatic Configuration

Your backend now automatically allows:

**Production (NODE_ENV=production)**
- `https://knost.in`
- `https://www.knost.in`

**Development (NODE_ENV=development)**
- `http://localhost:3000`, `localhost:5173`, etc.
- `https://api-dev.knost.in` (if `DEV_DOMAIN=api-dev.knost.in`)

## 6. Testing the Setup

### Local Development
```bash
# Terminal 1: Backend
cd knost-backend
npm start

# Terminal 2: Frontend
cd knost-frontend
npm run dev

# Visit http://localhost:3000
```

### Development Domain (api-dev.knost.in)
```bash
# Update your frontend to use https://api-dev.knost.in
# Make sure your local machine IP is pointing to api-dev.knost.in

# Test
curl https://api-dev.knost.in/api/auth/verify
```

### Production (Render)
```bash
# Your Render app automatically gets:
# - https://your-app.onrender.com (temporary)
# - https://api.knost.in (custom domain via GoDaddy)

# Test
curl https://api.knost.in/api/auth/verify
```

## 7. Troubleshooting

### "Connection refused" on api-dev.knost.in
- Check GoDaddy DNS A record points to your machine's IP
- Ensure your firewall allows port 5000
- Check if your ISP blocks port 5000 (try forwarding to 443)
- Use ngrok or Cloudflare tunnel as workaround

### CORS error with api-dev.knost.in
- Verify `DEV_DOMAIN=api-dev.knost.in` in your `.env`
- Restart backend to apply changes
- Check browser console for exact error

### SSL certificate errors
- Use self-signed cert for local development
- Or use Cloudflare tunnel (simplest)
- Or use ngrok with HTTPS

### DNS propagation delay
- Changes can take up to 48 hours
- Check status: `nslookup api-dev.knost.in`
- Use GoDaddy's DNS checker

## 8. Environment Summary

| Domain | Environment | Location | NODE_ENV |
|--------|-------------|----------|----------|
| `api.knost.in` | Production | Render | `production` |
| `api-dev.knost.in` | Development | Local Machine | `development` |
| `localhost:5000` | Local Dev | Local Machine | `development` |

## 🚀 Quick Start Checklist

- [ ] Update GoDaddy DNS for `api.knost.in` → Render
- [ ] Update GoDaddy DNS for `api-dev.knost.in` → Your IP
- [ ] Set `DEV_DOMAIN=api-dev.knost.in` in backend `.env`
- [ ] Update frontend API URL based on environment
- [ ] Test `https://api.knost.in/api/auth/verify` (production)
- [ ] Test `https://api-dev.knost.in/api/auth/verify` (development)
- [ ] Enable SSL/HTTPS on both domains

