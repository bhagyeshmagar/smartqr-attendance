import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create domain
    const domain = await prisma.domain.upsert({
        where: { slug: 'demo-university' },
        update: {},
        create: {
            name: 'Demo University',
            slug: 'demo-university',
        },
    });
    console.log(`✅ Created domain: ${domain.name}`);

    // Create super admin (no domain)
    const superAdminPassword = await bcrypt.hash('superadmin123', 10);
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@smartqr.local' },
        update: {},
        create: {
            email: 'superadmin@smartqr.local',
            passwordHash: superAdminPassword,
            firstName: 'Super',
            lastName: 'Admin',
            role: 'SUPER_ADMIN',
            isActive: true,
        },
    });
    console.log(`✅ Created super admin: ${superAdmin.email}`);

    // Create domain admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            passwordHash: adminPassword,
            firstName: 'John',
            lastName: 'Admin',
            role: 'ADMIN',
            isActive: true,
            domainId: domain.id,
        },
    });
    console.log(`✅ Created admin: ${admin.email}`);

    // Create sample students
    const studentPassword = await bcrypt.hash('student123', 10);

    const students = [
        { email: 'student1@example.com', firstName: 'Alice', lastName: 'Student' },
        { email: 'student2@example.com', firstName: 'Bob', lastName: 'Student' },
        { email: 'student3@example.com', firstName: 'Charlie', lastName: 'Student' },
    ];

    for (const studentData of students) {
        const student = await prisma.user.upsert({
            where: { email: studentData.email },
            update: {},
            create: {
                email: studentData.email,
                passwordHash: studentPassword,
                firstName: studentData.firstName,
                lastName: studentData.lastName,
                role: 'STUDENT',
                isActive: true,
                domainId: domain.id,
            },
        });
        console.log(`✅ Created student: ${student.email}`);
    }

    // Create a sample session
    const session = await prisma.session.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            title: 'Introduction to Computer Science',
            description: 'First lecture of the semester',
            status: 'DRAFT',
            domainId: domain.id,
            createdById: admin.id,
        },
    });
    console.log(`✅ Created sample session: ${session.title}`);

    console.log('\n📋 Seed Summary:');
    console.log('================');
    console.log(`Super Admin: superadmin@smartqr.local / superadmin123`);
    console.log(`Admin: admin@example.com / admin123`);
    console.log(`Students: student1@example.com, student2@example.com, student3@example.com / student123`);
    console.log(`Domain: ${domain.name} (${domain.slug})`);
    console.log(`Sample Session: ${session.title}`);
    console.log('\n🎉 Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
