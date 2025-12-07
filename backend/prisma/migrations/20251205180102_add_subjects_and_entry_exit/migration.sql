-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "domainId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "subjects_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subjects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_attendances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryAt" DATETIME,
    "exitAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "markedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tokenIat" DATETIME NOT NULL,
    "tokenExp" DATETIME NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "deviceFp" TEXT,
    "geo" TEXT,
    "verificationFlags" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendances_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_attendances" ("createdAt", "deviceFp", "geo", "id", "ip", "markedAt", "sessionId", "tokenExp", "tokenIat", "updatedAt", "userAgent", "userId", "verificationFlags") SELECT "createdAt", "deviceFp", "geo", "id", "ip", "markedAt", "sessionId", "tokenExp", "tokenIat", "updatedAt", "userAgent", "userId", "verificationFlags" FROM "attendances";
DROP TABLE "attendances";
ALTER TABLE "new_attendances" RENAME TO "attendances";
CREATE INDEX "attendances_sessionId_idx" ON "attendances"("sessionId");
CREATE INDEX "attendances_userId_idx" ON "attendances"("userId");
CREATE INDEX "attendances_markedAt_idx" ON "attendances"("markedAt");
CREATE INDEX "attendances_status_idx" ON "attendances"("status");
CREATE UNIQUE INDEX "attendances_sessionId_userId_key" ON "attendances"("sessionId", "userId");
CREATE TABLE "new_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "phase" TEXT NOT NULL DEFAULT 'ENTRY',
    "subjectId" TEXT,
    "sessionNumber" INTEGER NOT NULL DEFAULT 1,
    "domainId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "scheduledAt" DATETIME,
    "rotationCounter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sessions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sessions_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_sessions" ("createdAt", "createdById", "description", "domainId", "endedAt", "id", "rotationCounter", "scheduledAt", "startedAt", "status", "title", "updatedAt") SELECT "createdAt", "createdById", "description", "domainId", "endedAt", "id", "rotationCounter", "scheduledAt", "startedAt", "status", "title", "updatedAt" FROM "sessions";
DROP TABLE "sessions";
ALTER TABLE "new_sessions" RENAME TO "sessions";
CREATE INDEX "sessions_domainId_idx" ON "sessions"("domainId");
CREATE INDEX "sessions_subjectId_idx" ON "sessions"("subjectId");
CREATE INDEX "sessions_status_idx" ON "sessions"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "subjects_domainId_idx" ON "subjects"("domainId");
