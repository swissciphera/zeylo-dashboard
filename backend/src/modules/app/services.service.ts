import { Injectable, NotFoundException } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateServiceDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() priceLabel?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateServiceDto extends CreateServiceDto {}

// Free-form service catalogue (nettoyage, fiduciaire, dropservicing, etc.).
@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.service.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(companyId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({ data: { companyId, ...dto } });
  }

  async update(companyId: string, id: string, dto: UpdateServiceDto) {
    await this.ensureOwned(companyId, id);
    return this.prisma.service.update({ where: { id }, data: { ...dto } });
  }

  async remove(companyId: string, id: string) {
    await this.ensureOwned(companyId, id);
    await this.prisma.service.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureOwned(companyId: string, id: string) {
    const found = await this.prisma.service.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Service introuvable.');
  }
}
