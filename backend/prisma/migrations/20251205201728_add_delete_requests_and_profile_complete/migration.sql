-- CreateTable
CREATE TABLE "delete_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sessionId" TEXT,
    "subjectId" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "delete_requests_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "delete_requests_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "delete_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "delete_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "domainId" TEXT,
    "prn" TEXT,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "nationality" TEXT,
    "phone" TEXT,
    "currentAddress" TEXT,
    "permanentAddress" TEXT,
    "academicMarks" TEXT,
    "refreshToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("academicMarks", "createdAt", "currentAddress", "dateOfBirth", "domainId", "email", "firstName", "gender", "id", "isActive", "lastName", "nationality", "passwordHash", "permanentAddress", "phone", "prn", "refreshToken", "role", "updatedAt") SELECT "academicMarks", "createdAt", "currentAddress", "dateOfBirth", "domainId", "email", "firstName", "gender", "id", "isActive", "lastName", "nationality", "passwordHash", "permanentAddress", "phone", "prn", "refreshToken", "role", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_prn_key" ON "users"("prn");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_domainId_idx" ON "users"("domainId");
CREATE INDEX "users_prn_idx" ON "users"("prn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "delete_requests_status_idx" ON "delete_requests"("status");

-- CreateIndex
CREATE INDEX "delete_requests_type_idx" ON "delete_requests"("type");
