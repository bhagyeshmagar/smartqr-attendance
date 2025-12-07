# SmartQR Attendance System

A QR-based attendance system with rotating tokens, real-time updates, fraud detection, and comprehensive user management.

## 🚀 Features

- **Rotating QR Tokens**: HMAC-SHA256 signed tokens that rotate every 30 seconds
- **Real-time Updates**: WebSocket-based token broadcasts and live attendance feeds
- **Fraud Detection**: Geo-dispersion detection flags attendance from 3+ countries
- **Multi-tenant**: Support for multiple domains/organizations
- **Role-based Access**: Super Admin, Admin, and Student roles
- **User Management**: Admin can view all users, assign PRN, delete with password verification
- **Student Profiles**: Students can edit personal details, academic marks (PRN read-only)
- **PWA Support**: Student app works offline and can be installed on mobile devices
- **Rate Limiting**: Protected endpoints to prevent abuse

## 📋 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React (Vite) PWA + zxing-js |
| Backend | Node.js + NestJS (TypeScript) |
| ORM | Prisma |
| Database | SQLite (local) / PostgreSQL (production) |
| Cache | In-memory (local) / Redis (production) |
| WebSocket | Socket.IO |
| Container | Docker & Docker Compose |

## 🏗️ Project Structure

```
smartqr-attendance/
├── backend/                  # NestJS API
│   ├── prisma/              # Schema & migrations
│   ├── src/
│   │   ├── auth/            # JWT authentication
│   │   ├── users/           # User management (PRN, delete)
│   │   ├── profile/         # Student profile endpoint
│   │   ├── domains/         # Multi-tenant domains
│   │   ├── sessions/        # Session CRUD
│   │   ├── qr/              # Token generation
│   │   ├── attendance/      # Scan endpoint
│   │   ├── anomaly/         # Fraud detection
│   │   ├── ws/              # WebSocket gateway
│   │   └── common/          # Shared types
│   └── test/                # E2E tests
├── frontend/                 # React PWA
│   └── src/
│       ├── pages/admin/     # Admin UI (Sessions, Users)
│       └── pages/student/   # Student scanner, Profile
├── infra/
│   └── docker-compose.yml   # Container orchestration
└── .github/workflows/       # CI pipeline
```

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- npm or yarn

### 1. Clone and Setup

```bash
cd smartqr-attendance

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Setup Environment

```bash
# Copy environment file
cp .env.example .env
cp .env.example backend/.env
```

Edit `backend/.env` and set:
```env
DATABASE_URL=file:./dev.db
```

### 3. Initialize Database

```bash
cd backend

# Set environment variable and run migration
# Windows PowerShell:
$env:DATABASE_URL='file:./dev.db'; npx prisma migrate dev --name init

# Seed with test data
$env:DATABASE_URL='file:./dev.db'; npx prisma db seed
```

### 4. Start Development Servers

```bash
# Terminal 1: Backend (port 4000)
cd backend
$env:DATABASE_URL='file:./dev.db'; npm run start:dev

# Terminal 2: Frontend (port 5173)
cd frontend
npm run dev
```

### 5. Access the Application

| Service | URL |
|---------|-----|
| Admin Portal | http://localhost:5173/login |
| Student Portal | http://localhost:5173/student/login |
| Student Register | http://localhost:5173/student/register |
| Backend API | http://localhost:4000/api |
| Swagger Docs | http://localhost:4000/api/docs |
| Health Check | http://localhost:4000/api/health |

## 👤 Default Accounts

After seeding:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Student | student1@example.com | student123 |
| Student | student2@example.com | student123 |
| Student | student3@example.com | student123 |

## 📱 Usage Flow

### Admin Flow

1. Login at http://localhost:5173/login with admin credentials
2. **Sessions**: Create, start, and manage attendance sessions
3. **Users**: View all users, assign PRN numbers, delete users (requires password)
4. Start session to display rotating QR code
5. Monitor live attendance updates

### Student Flow

1. Login at http://localhost:5173/student/login
2. **Scan**: Point camera at QR code to mark attendance
3. **History**: View attendance records
4. **Profile**: Edit personal details (name, DOB, gender, phone, address, academic marks)
   - PRN is **read-only** (assigned by admin)

## 🔐 Token Format

```
<base64url_payload>.<hex_signature>
```

### Payload Structure

```json
{
  "sid": "session-uuid",      // Session ID
  "did": "domain-1",          // Domain ID
  "iat": 1704067200,          // Issued at (Unix timestamp)
  "exp": 1704067230,          // Expires at (iat + 30 seconds)
  "rot": 5                    // Rotation counter
}
```

## 🛡️ Fraud Detection

The system implements a geo-dispersion heuristic:

1. Each token scan records IP, device fingerprint, and country
2. If a token is used from **3+ distinct countries**, attendance is flagged

```json
{
  "verificationFlags": {
    "flagged": true,
    "reason": "geo-dispersion"
  }
}
```

## 📡 Key API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user
- `POST /api/auth/refresh` - Refresh token

### Users (Admin)
- `GET /api/users` - List all users
- `PATCH /api/users/:id/prn` - Assign PRN
- `POST /api/users/:id/delete` - Delete with password verification

### Profile (Student)
- `GET /api/profile` - Get own profile
- `PATCH /api/profile` - Update profile

### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `POST /api/sessions/:id/start` - Start session
- `POST /api/sessions/:id/stop` - Stop session
- `GET /api/sessions/:id/token` - Get current QR token

### Attendance
- `POST /api/attendance/scan` - Scan QR code
- `GET /api/attendance/my` - My attendance history

## 🐳 Docker Setup (Production)

```bash
# Start all services
docker-compose -f infra/docker-compose.yml up --build -d

# Run migrations
docker-compose -f infra/docker-compose.yml exec backend npx prisma migrate deploy

# Seed database
docker-compose -f infra/docker-compose.yml exec backend npx prisma db seed
```

## 🐛 Troubleshooting

### Port Already in Use

```powershell
# Windows - find and kill process on port 4000
Get-NetTCPConnection -LocalPort 4000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Prisma Client Issues

```bash
# Regenerate Prisma client
$env:DATABASE_URL='file:./dev.db'; npx prisma generate
```

### Database Reset

```bash
# Reset and reseed (WARNING: deletes all data)
$env:DATABASE_URL='file:./dev.db'; npx prisma migrate reset --force
```

### Camera Not Working

1. Ensure HTTPS in production (required for camera access)
2. Grant camera permissions in browser
3. Use the manual token input as fallback

## ✅ Verification Checklist

- [ ] Admin can login at /login
- [ ] Student can login at /student/login
- [ ] Student can register at /student/register
- [ ] Admin can create and start sessions
- [ ] QR code rotates every 30 seconds
- [ ] Student can scan QR and mark attendance
- [ ] Admin can view all users and assign PRN
- [ ] Admin can delete user with password verification
- [ ] Student can edit profile (PRN read-only)
- [ ] Health check at /api/health returns OK

## 📄 License

MIT

---

Built with ❤️ using NestJS, React, Prisma, and SQLite/PostgreSQL
