# SmartQR Attendance System - Project Documentation (SRS)

## 1. Introduction
SmartQR is a secure, real-time attendance management system designed for educational domains. It uses dynamic QR codes to track student attendance with fraud-prevention mechanisms (token rotation, device fingerprinting, geo-fencing). The system supports role-based access (Super Admin, Admin, Student) and provides live dashboards for administrators.

### 1.1 Key Highlights
- **Unified Login:** Single login page for all user types (Super Admin, Admin, Student)
- **Liquid Glass UI:** Modern glassmorphism design with dark/light theme support
- **Multi-Admin Data Isolation:** Regular admins only see subjects/sessions they created
- **Delete Request Approval Workflow:** Destructive actions require Super Admin approval
- **Production-Ready Deployment:** Docker multi-stage builds, Render.com configuration

---

## 2. Technology Stack

### 2.1 Frontend
| Category | Technology |
|----------|------------|
| **Framework** | React 18.2 (Vite 5) |
| **Language** | TypeScript 5.3 |
| **Routing** | React Router DOM 6.21 |
| **State Management** | React Context API (Auth, Theme) |
| **HTTP Client** | Axios 1.6 |
| **QR Scanning** | @zxing/browser, @zxing/library |
| **QR Generation** | qrcode 1.5 |
| **Real-time** | socket.io-client 4.6 |
| **PWA Support** | vite-plugin-pwa, workbox-window |
| **Testing** | Vitest 1.1 |

### 2.2 Backend
| Category | Technology |
|----------|------------|
| **Framework** | NestJS 10 |
| **Language** | TypeScript 5.1 |
| **Database ORM** | Prisma 5.22 |
| **Database** | PostgreSQL (Neon for production) |
| **Real-time** | Socket.io 4.6, @nestjs/websockets |
| **Queue System** | BullMQ 5.65, ioredis 5.3 (Upstash Redis) |
| **Authentication** | Passport 0.7, passport-jwt, @nestjs/jwt |
| **API Documentation** | @nestjs/swagger 7.1 |
| **Security** | Helmet 7.1, @nestjs/throttler 5.1 |
| **Validation** | class-validator, class-transformer |
| **Testing** | Jest 29, Supertest 6.3 |

### 2.3 Styling & Design System
- **Design Philosophy:** "Liquid Glass" (Glassmorphism) inspired by iOS/macOS
- **Dark Mode:** "Tokyo Cyberpunk Night" - Electric cyan (#00D4FF), soft purple accents
- **Light Mode:** "Clean Modern" - Navy blue (#1E40AF) on soft white/gray backgrounds
- **Features:**
  - CSS custom properties for theming
  - Backdrop blur effects on modals and overlays
  - Smooth page transitions (sliding curtain effect)
  - Scanline animation overlay (dark mode)
  - Responsive grid layouts

---

## 3. System Architecture

```mermaid
graph TD
    subgraph "Frontend (React SPA)"
        Client[React Application]
        QRScanner[QR Scanner Component]
        QRGenerator[QR Code Generator]
        Modal[Floating Modal System]
        ThemeToggle[Theme Toggle]
    end
    
    subgraph "Backend (NestJS)"
        API[REST API Gateway]
        WS[Socket.io Server]
        AuthGuard[JWT Auth Guard]
        RoleGuard[Role-Based Access]
    end
    
    subgraph "External Services"
        Queue[BullMQ / Upstash Redis]
        DB[(PostgreSQL / Neon)]
    end
    
    Client -->|HTTP/REST| API
    Client -->|WebSocket| WS
    API --> AuthGuard --> RoleGuard
    API -->|Prisma ORM| DB
    API -->|Job Queue| Queue
    QRScanner -->|POST /attendance/scan| API
    QRGenerator -->|Token from session| API
    Modal -->|CRUD Operations| API
    ThemeToggle -->|localStorage| Client
    WS -->|emit attendance.update| Client
```

---

## 4. Database Schema (ERD)

```mermaid
erDiagram
    Domain ||--o{ User : "has members"
    Domain ||--o{ Subject : "has subjects"
    Domain ||--o{ Session : "has sessions"
    User ||--o{ Attendance : "scans"
    User ||--o{ Session : "creates"
    User ||--o{ Subject : "creates"
    User ||--o{ DeleteRequest : "requests"
    User ||--o{ DeleteRequest : "approves"
    Subject ||--o{ Session : "contains"
    Subject ||--o{ DeleteRequest : "may delete"
    Session ||--o{ Attendance : "tracks"
    Session ||--o{ DeleteRequest : "may delete"
    
    Domain {
        string id PK
        string name UK
        string slug UK
        datetime createdAt
        datetime updatedAt
    }
    
    User {
        string id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        string role "SUPER_ADMIN | ADMIN | STUDENT"
        boolean isActive
        boolean profileComplete
        string prn UK "Permanent Registration Number"
        string domainId FK
        datetime dateOfBirth
        string gender
        string phone
        string currentAddress
        string permanentAddress
        string academicMarks "JSON"
        string refreshToken
    }
    
    Subject {
        string id PK
        string name
        string code
        string description
        string domainId FK
        string createdById FK
    }
    
    Session {
        string id PK
        string title
        string description
        string status "DRAFT | ACTIVE | COMPLETED | CANCELLED"
        string phase "ENTRY | EXIT"
        int sessionNumber
        int rotationCounter
        string subjectId FK
        string domainId FK
        string createdById FK
        datetime startedAt
        datetime endedAt
        datetime scheduledAt
    }
    
    Attendance {
        string id PK
        string sessionId FK
        string userId FK
        datetime entryAt
        datetime exitAt
        string status "PENDING | PRESENT | ABSENT"
        datetime tokenIat
        datetime tokenExp
        string ip
        string userAgent
        string deviceFp
        string geo "JSON"
        string verificationFlags "JSON"
    }
    
    DeleteRequest {
        string id PK
        string type "SESSION | SUBJECT"
        string reason
        string status "PENDING | APPROVED | DENIED"
        string sessionId FK
        string subjectId FK
        string requestedById FK
        string approvedById FK
    }
```

---

## 5. Role-Based Access Control

| Feature | Super Admin | Admin | Student |
|---------|:-----------:|:-----:|:-------:|
| Create Domain | ✅ | ❌ | ❌ |
| Create Admin Users | ✅ | ❌ | ❌ |
| Create Student Users | ✅ | ✅ | ❌ |
| View All Subjects | ✅ | Own Only | ❌ |
| Create Subjects | ✅ | ✅ | ❌ |
| View All Sessions | ✅ | Own Only | Enrolled |
| Create Sessions | ✅ | ✅ | ❌ |
| Delete Sessions/Subjects | ✅ | Request Required | ❌ |
| Approve Delete Requests | ✅ | ❌ | ❌ |
| View All Users | ✅ | Students Only | ❌ |
| Edit User Emails | ✅ | Students Only | ❌ |
| Scan QR for Attendance | ❌ | ❌ | ✅ |
| View Own Attendance | ❌ | ❌ | ✅ |
| Edit Own Profile | ✅ | ✅ | ✅ |
| Change Theme | ✅ | ✅ | ✅ |

---

## 6. User Flows

### 6.1 Unified Login Flow
```mermaid
sequenceDiagram
    participant User as User (Any Role)
    participant LoginPage as Unified Login
    participant API as Backend API
    participant DB as Database
    
    User->>LoginPage: Enter email & password
    LoginPage->>API: POST /api/auth/login
    API->>DB: Validate credentials
    DB-->>API: User with role
    API-->>LoginPage: Access + Refresh tokens
    LoginPage->>LoginPage: Store tokens, detect role
    alt Super Admin / Admin
        LoginPage->>User: Redirect to /admin/sessions
    else Student
        LoginPage->>User: Redirect to /student/dashboard
    end
```

### 6.2 Delete Request Approval Workflow
```mermaid
sequenceDiagram
    participant Admin as Regular Admin
    participant API as Backend API
    participant DB as Database
    participant SuperAdmin as Super Admin
    
    Admin->>API: Request delete (session/subject)
    API->>DB: Create DeleteRequest (status=PENDING)
    DB-->>API: Request ID
    API-->>Admin: "Request submitted for approval"
    
    Note over SuperAdmin: Views Delete Requests page
    SuperAdmin->>API: GET /api/delete-requests
    API-->>SuperAdmin: List pending requests
    
    alt Approve
        SuperAdmin->>API: PATCH /api/delete-requests/:id/approve
        API->>DB: Delete target entity
        API->>DB: Update request status=APPROVED
    else Deny
        SuperAdmin->>API: PATCH /api/delete-requests/:id/deny
        API->>DB: Update request status=DENIED
    end
```

### 6.3 Attendance Marking (Student)
```mermaid
sequenceDiagram
    participant Student as Student Device
    participant Scanner as QR Scanner
    participant API as Backend API
    participant WS as Socket.io
    participant AdminDash as Admin Dashboard
    
    Student->>Scanner: Open camera, scan QR
    Scanner->>Scanner: Decode JWT from QR
    Scanner->>API: POST /api/attendance/scan
    API->>API: Validate JWT signature
    API->>API: Check rotation counter (anti-replay)
    API->>API: Verify session is ACTIVE
    API->>API: Check entry/exit phase
    
    alt Entry Phase
        API->>API: Create attendance (entryAt, status=PENDING)
    else Exit Phase
        API->>API: Update attendance (exitAt, status=PRESENT)
    end
    
    API-->>Scanner: Success response
    API->>WS: Emit "attendance.update"
    WS->>AdminDash: Real-time count refresh
```

### 6.4 Session Lifecycle
```mermaid
stateDiagram-v2
    [*] --> DRAFT: Create Session
    DRAFT --> ACTIVE: Start Session
    ACTIVE --> ACTIVE: Toggle Phase (ENTRY ↔ EXIT)
    ACTIVE --> COMPLETED: End Session
    DRAFT --> CANCELLED: Cancel
    ACTIVE --> CANCELLED: Cancel
    COMPLETED --> [*]
    CANCELLED --> [*]
    
    note right of ACTIVE
        QR token rotates every X seconds
        rotationCounter increments
    end note
```

---

## 7. API Endpoints

### 7.1 Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Unified login, returns access & refresh JWTs | Public |
| POST | `/api/auth/refresh` | Refresh access token | Refresh Token |
| POST | `/api/auth/logout` | Invalidate refresh token | JWT |
| GET | `/api/auth/me` | Get current user profile | JWT |

### 7.2 Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | List users (role-filtered) | Admin |
| POST | `/api/users` | Create new user | Admin |
| GET | `/api/users/:id` | Get user details | Admin |
| PATCH | `/api/users/:id` | Update user (including email) | Admin |
| DELETE | `/api/users/:id` | Delete user | Super Admin |
| PATCH | `/api/users/:id/profile` | Update own profile | JWT |
| PATCH | `/api/users/:id/password` | Change password | JWT |

### 7.3 Subjects
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/subjects` | List subjects (creator-filtered for admins) | Admin |
| POST | `/api/subjects` | Create subject | Admin |
| GET | `/api/subjects/:id` | Get subject with sessions | Admin |
| PATCH | `/api/subjects/:id` | Update subject | Admin (creator) |
| DELETE | `/api/subjects/:id` | Delete subject (or request) | Admin |

### 7.4 Sessions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/sessions` | List sessions (creator-filtered) | Admin |
| POST | `/api/sessions` | Create session under subject | Admin |
| GET | `/api/sessions/:id` | Get session with attendance | Admin |
| POST | `/api/sessions/:id/start` | Activate session, generate QR | Admin |
| POST | `/api/sessions/:id/toggle-phase` | Switch ENTRY ↔ EXIT | Admin |
| POST | `/api/sessions/:id/end` | Complete session | Admin |
| DELETE | `/api/sessions/:id` | Delete session (or request) | Admin |

### 7.5 Attendance
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/attendance/scan` | Record attendance via QR token | Student |
| GET | `/api/attendance/session/:id` | Get attendance list for session | Admin |
| GET | `/api/attendance/student/:id` | Get student's attendance history | Admin/Student |

### 7.6 Delete Requests
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/delete-requests` | List pending requests | Super Admin |
| POST | `/api/delete-requests` | Create delete request | Admin |
| PATCH | `/api/delete-requests/:id/approve` | Approve and execute | Super Admin |
| PATCH | `/api/delete-requests/:id/deny` | Deny request | Super Admin |

### 7.7 Health Check
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check for load balancers | Public |

---

## 8. Frontend Pages

### 8.1 Admin Pages
| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `Login.tsx` | Unified login (auto-detect role) |
| `/admin/sessions` | `Sessions.tsx` | List/manage sessions |
| `/admin/sessions/new` | `CreateSession.tsx` | Create new session |
| `/admin/sessions/:id` | `SessionDetail.tsx` | Session detail with live attendance, QR display |
| `/admin/subjects` | `Subjects.tsx` | List/manage subjects |
| `/admin/subjects/:id` | `SubjectDetail.tsx` | Subject detail with sessions |
| `/admin/users` | `Users.tsx` | User management (create admin/student) |
| `/admin/delete-requests` | `DeleteRequests.tsx` | Approval queue (Super Admin) |
| `/admin/profile` | `Profile.tsx` | View/edit profile, change password |

### 8.2 Student Pages
| Route | Component | Description |
|-------|-----------|-------------|
| `/student/dashboard` | Dashboard | Overview, recent attendance |
| `/student/scan` | Scanner | QR scanner for attendance |
| `/student/attendance` | Attendance History | View past attendance |
| `/student/profile` | Profile | View/edit personal details |

---

## 9. Deployment Configuration

### 9.1 Docker (Backend)
Multi-stage Dockerfile with:
- **Build Stage:** Node 20 Alpine, install deps, generate Prisma client, compile TypeScript
- **Production Stage:** Minimal image, production deps only, health check
- **Startup:** Run migrations → seed → start server

```dockerfile
# Key configurations
FROM node:20-alpine
RUN apk add --no-cache openssl  # Required for Prisma
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --spider http://localhost:4000/api/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/src/main.js"]
```

### 9.2 Render.com Blueprint (`render.yaml`)
```yaml
services:
  # Backend - Web Service
  - type: web
    name: smartqr-backend
    runtime: node
    region: oregon
    rootDir: backend
    buildCommand: npm ci && npx prisma generate && npm run build
    startCommand: npx prisma migrate deploy && node dist/main.js
    healthCheckPath: /api/health
    envVars:
      - DATABASE_URL (Neon PostgreSQL)
      - REDIS_URL (Upstash Redis)
      - JWT_SECRET, REFRESH_TOKEN_SECRET, HMAC_SECRET
      - CORS_ORIGINS
      
  # Frontend - Static Site
  - type: web
    name: smartqr-frontend
    runtime: static
    rootDir: frontend
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    envVars:
      - VITE_API_URL
      - VITE_WS_URL
```

### 9.3 Environment Variables

#### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection (Neon) | `postgresql://user:pass@host/db?sslmode=require` |
| `REDIS_URL` | Redis connection (Upstash) | `rediss://default:token@host:6379` |
| `JWT_SECRET` | Access token signing key | `<random-64-chars>` |
| `REFRESH_TOKEN_SECRET` | Refresh token signing key | `<random-64-chars>` |
| `HMAC_SECRET` | QR token HMAC key | `<random-64-chars>` |
| `JWT_EXPIRES_IN` | Access token TTL | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token TTL | `7d` |
| `QR_TTL_SECONDS` | QR rotation interval | `30` |
| `CORS_ORIGINS` | Allowed origins | `https://smartqr-frontend.onrender.com` |
| `RATE_LIMIT_TTL` | Rate limit window (seconds) | `60` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

#### Frontend
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://smartqr-backend.onrender.com` |
| `VITE_WS_URL` | WebSocket endpoint | `wss://smartqr-backend.onrender.com` |

---

## 10. Security Features

| Feature | Implementation |
|---------|----------------|
| **Password Hashing** | bcrypt with salt rounds |
| **JWT Authentication** | Short-lived access (15m), long-lived refresh (7d) |
| **Token Rotation** | QR tokens rotate every N seconds with counter validation |
| **Rate Limiting** | Global (100/min), scan-specific (10/min) |
| **CORS** | Strict origin whitelist |
| **Helmet** | Security headers (XSS, clickjacking protection) |
| **Input Validation** | class-validator DTOs on all endpoints |
| **Device Fingerprinting** | Optional FP, mandatory IP + User-Agent logging |
| **Role Guards** | Decorator-based access control per endpoint |

---

## 11. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Page Load** | < 2 seconds |
| **QR Scan Validation** | < 200 ms |
| **Uptime** | 99.9% |
| **Concurrent Users** | 1000+ |
| **Scalability** | Stateless JWT, horizontal scaling via Redis |
| **Accessibility** | ARIA attributes on modals, keyboard navigation |
| **Browser Support** | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| **Mobile Support** | Responsive design, PWA-ready |

---

## 12. Future Enhancements

- [ ] Push notifications for session start
- [ ] Bulk student import via CSV
- [ ] Attendance analytics dashboard with charts
- [ ] Export attendance reports (PDF, Excel)
- [ ] Multi-factor authentication
- [ ] Geo-fencing enforcement (classroom radius check)
- [ ] Facial recognition as secondary verification
- [ ] Mobile app (React Native)

---

*Document updated on 2025-12-08.*
