import { Injectable, NotFoundException } from '@nestjs/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ContactKind, ContactType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export class ContactDto {
  @IsEnum(ContactType) type!: ContactType;
  @IsEnum(ContactKind) kind!: ContactKind;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() streetNumber?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() canton?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() ideNumber?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsString() photoFileId?: string;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string, type?: ContactType) {
    return this.prisma.contact.findMany({
      where: { companyId, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  detail(companyId: string, id: string) {
    return this.ensureOwned(companyId, id);
  }

  private displayName(dto: ContactDto): string {
    if (dto.kind === 'ENTERPRISE') {
      return dto.companyName?.trim() || 'Entreprise';
    }
    const full = `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim();
    return full || 'Contact';
  }

  create(companyId: string, dto: ContactDto) {
    return this.prisma.contact.create({
      data: { companyId, source: 'MANUAL', name: this.displayName(dto), ...dto },
    });
  }

  async update(companyId: string, id: string, dto: ContactDto) {
    await this.ensureOwned(companyId, id);
    return this.prisma.contact.update({
      where: { id },
      data: { name: this.displayName(dto), ...dto },
    });
  }

  async remove(companyId: string, id: string) {
    await this.ensureOwned(companyId, id);
    await this.prisma.contact.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureOwned(companyId: string, id: string) {
    const found = await this.prisma.contact.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Contact introuvable.');
    return found;
  }
}
