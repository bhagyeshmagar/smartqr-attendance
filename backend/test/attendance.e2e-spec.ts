import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Attendance Flow (e2e)', () => {
    let app: INestApplication;
    let adminToken: string;
    let studentToken: string;
    let sessionId: string;

    // Skip in CI - requires running database
    const skipIfNoDb = process.env.DATABASE_URL ? describe : describe.skip;

    skipIfNoDb('Full attendance flow', () => {
        beforeAll(async () => {
            const moduleFixture: TestingModule = await Test.createTestingModule({
                imports: [AppModule],
            }).compile();

            app = moduleFixture.createNestApplication();
            app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
            app.setGlobalPrefix('api');
            await app.init();
        });

        afterAll(async () => {
            await app.close();
        });

        it('should login as admin', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    email: 'admin@example.com',
                    password: 'admin123',
                })
                .expect(200);

            expect(response.body.accessToken).toBeDefined();
            adminToken = response.body.accessToken;
        });

        it('should login as student', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    email: 'student1@example.com',
                    password: 'student123',
                })
                .expect(200);

            expect(response.body.accessToken).toBeDefined();
            studentToken = response.body.accessToken;
        });

        it('should create a session', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/sessions')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'E2E Test Session',
                    description: 'Test session for e2e testing',
                    domainId: 'domain-id', // Would need actual domain ID
                })
                .expect(201);

            expect(response.body.id).toBeDefined();
            sessionId = response.body.id;
        });

        it('should start the session', async () => {
            await request(app.getHttpServer())
                .post(`/api/sessions/${sessionId}/start`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });

        it('should get a QR token for the session', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/sessions/${sessionId}/token`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.token).toBeDefined();
        });

        it('should mark attendance with valid token', async () => {
            // First get the token
            const tokenResponse = await request(app.getHttpServer())
                .get(`/api/sessions/${sessionId}/token`)
                .set('Authorization', `Bearer ${adminToken}`);

            const token = tokenResponse.body.token;

            // Then scan with student
            const response = await request(app.getHttpServer())
                .post('/api/attendance/scan')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ token })
                .expect(201);

            expect(response.body.success).toBe(true);
        });

        it('should reject duplicate attendance', async () => {
            const tokenResponse = await request(app.getHttpServer())
                .get(`/api/sessions/${sessionId}/token`)
                .set('Authorization', `Bearer ${adminToken}`);

            const token = tokenResponse.body.token;

            await request(app.getHttpServer())
                .post('/api/attendance/scan')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ token })
                .expect(409); // Conflict
        });

        it('should stop the session', async () => {
            await request(app.getHttpServer())
                .post(`/api/sessions/${sessionId}/stop`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
        });
    });
});
