import { Injectable, NotFoundException } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ContactType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateContactDto {
  @IsString() @MinLength(1) name!: string;
  @IsEnum(ContactType) type!: ContactType;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateContactDto extends CreateContactDto {}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string, type?: ContactType) {
    return this.prisma.contact.findMany({
      where: { companyId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(companyId: string, dto: CreateContactDto) {
    return this.prisma.contact.create({
      data: { companyId, source: 'MANUAL', ...dto },
    });
  }

  async update(companyId: string, id: string, dto: UpdateContactDto) {
    await this.ensureOwned(companyId, id);
    return this.prisma.contact.update({ where: { id }, data: { ...dto } });
  }

  async remove(companyId: string, id: string) {
    await this.ensureOwned(companyId, id);
    await this.prisma.contact.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureOwned(companyId: string, id: string) {
    const found = await this.prisma.contact.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Contact introuvable.');
  }
}
