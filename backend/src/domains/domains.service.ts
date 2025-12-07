import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDomainDto } from './dto/create-domain.dto';

@Injectable()
export class DomainsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateDomainDto) {
        const existing = await this.prisma.domain.findFirst({
            where: {
                OR: [{ name: dto.name }, { slug: dto.slug }],
            },
        });

        if (existing) {
            throw new ConflictException('Domain with this name or slug already exists');
        }

        return this.prisma.domain.create({
            data: {
                name: dto.name,
                slug: dto.slug,
            },
        });
    }

    async findAll() {
        return this.prisma.domain.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        sessions: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findById(id: string) {
        const domain = await this.prisma.domain.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        sessions: true,
                    },
                },
            },
        });

        if (!domain) {
            throw new NotFoundException('Domain not found');
        }

        return domain;
    }

    async findBySlug(slug: string) {
        const domain = await this.prisma.domain.findUnique({
            where: { slug },
        });

        if (!domain) {
            throw new NotFoundException('Domain not found');
        }

        return domain;
    }

    async update(id: string, dto: Partial<CreateDomainDto>) {
        await this.findById(id);

        return this.prisma.domain.update({
            where: { id },
            data: dto,
        });
    }

    async delete(id: string) {
        await this.findById(id);

        await this.prisma.domain.delete({
            where: { id },
        });
    }
}
