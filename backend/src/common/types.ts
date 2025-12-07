/**
 * Shared types for the application
 * These replace Prisma enums which aren't available with SQLite
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT';

export const UserRole = {
    SUPER_ADMIN: 'SUPER_ADMIN' as const,
    ADMIN: 'ADMIN' as const,
    STUDENT: 'STUDENT' as const,
};

export type SessionStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export const SessionStatus = {
    DRAFT: 'DRAFT' as const,
    ACTIVE: 'ACTIVE' as const,
    COMPLETED: 'COMPLETED' as const,
    CANCELLED: 'CANCELLED' as const,
};

export type SessionPhase = 'ENTRY' | 'EXIT';

export const SessionPhase = {
    ENTRY: 'ENTRY' as const,
    EXIT: 'EXIT' as const,
};

export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'ABSENT';

export const AttendanceStatus = {
    PENDING: 'PENDING' as const,
    PRESENT: 'PRESENT' as const,
    ABSENT: 'ABSENT' as const,
};
