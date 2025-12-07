import { Injectable, NotFoundException, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                domainId: true,
                isActive: true,
                profileComplete: true,
                prn: true,
                dateOfBirth: true,
                gender: true,
                nationality: true,
                phone: true,
                currentAddress: true,
                permanentAddress: true,
                academicMarks: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findByDomain(domainId: string, role?: UserRole) {
        return this.prisma.user.findMany({
            where: {
                domainId,
                ...(role && { role }),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                profileComplete: true,
                prn: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                domainId: true,
                isActive: true,
                profileComplete: true,
                prn: true,
                dateOfBirth: true,
                gender: true,
                nationality: true,
                phone: true,
                createdAt: true,
                domain: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAdmins() {
        return this.prisma.user.findMany({
            where: { role: UserRole.ADMIN },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                profileComplete: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async createAdmin(email: string, firstName: string, lastName: string, tempPassword: string) {
        // Check if email already exists
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(tempPassword, 10);

        return this.prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                passwordHash,
                role: UserRole.ADMIN,
                profileComplete: false, // Must complete profile
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                profileComplete: true,
                createdAt: true,
            },
        });
    }

    async createStudent(email: string, firstName: string, lastName: string, tempPassword: string, domainId?: string) {
        // Check if email already exists
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(tempPassword, 10);

        return this.prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                passwordHash,
                role: UserRole.STUDENT,
                domainId: domainId || null,
                profileComplete: false,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                profileComplete: true,
                createdAt: true,
            },
        });
    }

    async updateStatus(id: string, isActive: boolean, requesterId: string, requesterRole: string) {
        // Get target user
        const targetUser = await this.prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        // Check permissions
        if (requesterRole === UserRole.ADMIN) {
            // Admin can only modify students
            if (targetUser.role !== UserRole.STUDENT) {
                throw new ForbiddenException('Admins can only manage students');
            }
            // Admin cannot modify themselves
            if (targetUser.id === requesterId) {
                throw new ForbiddenException('You cannot modify your own status');
            }
        }

        // Super Admin can't be deactivated by anyone
        if (targetUser.role === UserRole.SUPER_ADMIN && !isActive) {
            throw new ForbiddenException('Super Admin status cannot be changed');
        }

        return this.prisma.user.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
            },
        });
    }

    async assignPrn(id: string, prn: string) {
        const existingPrn = await this.prisma.user.findFirst({
            where: { prn, id: { not: id } },
        });

        if (existingPrn) {
            throw new ConflictException('PRN already assigned to another user');
        }

        return this.prisma.user.update({
            where: { id },
            data: { prn },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                prn: true,
            },
        });
    }

    async updateEmail(userId: string, newEmail: string, requesterId: string, requesterRole: string) {
        // Check if email already exists
        const existingEmail = await this.prisma.user.findUnique({ where: { email: newEmail } });
        if (existingEmail && existingEmail.id !== userId) {
            throw new ConflictException('Email already in use');
        }

        // Get target user
        const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        // Check permissions
        if (requesterRole === UserRole.ADMIN) {
            // Admin can only update student emails
            if (targetUser.role !== UserRole.STUDENT) {
                throw new ForbiddenException('Admins can only update student emails');
            }
        } else if (requesterRole !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Unauthorized');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { email: newEmail },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
    }

    async deleteUser(id: string, requesterId: string, requesterRole: string) {
        const targetUser = await this.prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        // Check permissions
        if (requesterRole === UserRole.ADMIN) {
            // Admin can only delete students
            if (targetUser.role !== UserRole.STUDENT) {
                throw new ForbiddenException('Admins can only delete students');
            }
            // Admin cannot delete themselves
            if (targetUser.id === requesterId) {
                throw new ForbiddenException('You cannot delete yourself');
            }
        }

        // Super Admin can't be deleted
        if (targetUser.role === UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Super Admin cannot be deleted');
        }

        await this.prisma.user.delete({ where: { id } });
        return { message: 'User deleted successfully' };
    }

    async deleteWithPassword(id: string, adminId: string, password: string, requesterRole: string) {
        const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
        if (!admin) {
            throw new UnauthorizedException('Admin not found');
        }

        const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid password');
        }

        return this.deleteUser(id, adminId, requesterRole);
    }

    async delete(id: string) {
        await this.prisma.user.delete({ where: { id } });
    }

    async updateProfile(id: string, data: {
        firstName?: string;
        lastName?: string;
        dateOfBirth?: Date;
        gender?: string;
        nationality?: string;
        phone?: string;
        currentAddress?: string;
        permanentAddress?: string;
        academicMarks?: string;
    }) {
        // Check if profile is now complete
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        // Mark profile complete if basic fields are filled
        const profileComplete = !!(
            (data.firstName || user.firstName) &&
            (data.lastName || user.lastName) &&
            (data.phone || user.phone)
        );

        return this.prisma.user.update({
            where: { id },
            data: { ...data, profileComplete },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                prn: true,
                profileComplete: true,
                dateOfBirth: true,
                gender: true,
                nationality: true,
                phone: true,
                currentAddress: true,
                permanentAddress: true,
                academicMarks: true,
            },
        });
    }

    async changePassword(id: string, currentPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id },
            data: { passwordHash },
        });

        return { message: 'Password changed successfully' };
    }
}
