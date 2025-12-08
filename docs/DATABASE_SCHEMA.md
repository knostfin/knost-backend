# Database Schema

## Tables Required

### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  firstname VARCHAR(255) NOT NULL,
  lastname VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  photo_filename VARCHAR(255),
  photo_mimetype VARCHAR(50),
  photo_size INT,
  photo_updated_at TIMESTAMP,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  country_code VARCHAR(10),
  last_login TIMESTAMP;
);
```

### refresh_tokens
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

### email_verifications
```sql
CREATE TABLE email_verifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour',
  UNIQUE(user_id)
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

### Email Verification (requires auth)
- `POST /api/auth/request-email-verify` - Request email verification token
- `POST /api/auth/verify-email` - Verify and update email

## Notes
- Photo uploads are stored in `uploads/` directory (or configure cloud storage in `uploadMiddleware.js`)
- Email verification tokens expire in 1 hour
- All protected endpoints require `Authorization: Bearer <token>` header
