import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { LeaveType, NoteAuthorType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateEmployeeDto {
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() photoFileId?: string;
  @IsOptional() @IsString() contractFileId?: string;
  @IsOptional() @IsDateString() contractEndDate?: string;
}

export class UpdateEmployeeDto extends CreateEmployeeDto {}

export class CreateNoteDto {
  @IsEnum(NoteAuthorType) authorType!: NoteAuthorType;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() comment?: string;
}

export class CreateLeaveDto {
  @IsEnum(LeaveType) type!: LeaveType;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsString() reason?: string;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.employee.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { notes: true } } },
    });
  }

  async detail(companyId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId },
      include: {
        notes: { orderBy: { createdAt: 'desc' } },
        leaves: { orderBy: { startDate: 'desc' } },
        assignments: { include: { project: true } },
      },
    });
    if (!employee) throw new NotFoundException('Employé introuvable.');
    return employee;
  }

  create(companyId: string, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        companyId,
        ...dto,
        contractEndDate: dto.contractEndDate
          ? new Date(dto.contractEndDate)
          : null,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateEmployeeDto) {
    await this.ensureOwned(companyId, id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        contractEndDate: dto.contractEndDate
          ? new Date(dto.contractEndDate)
          : undefined,
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.ensureOwned(companyId, id);
    await this.prisma.employee.delete({ where: { id } });
    return { ok: true };
  }

  async addNote(companyId: string, id: string, dto: CreateNoteDto) {
    await this.ensureOwned(companyId, id);
    return this.prisma.employeeNote.create({
      data: { companyId, employeeId: id, ...dto },
    });
  }

  async addLeave(companyId: string, id: string, dto: CreateLeaveDto) {
    await this.ensureOwned(companyId, id);
    return this.prisma.leave.create({
      data: {
        companyId,
        employeeId: id,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
    });
  }

  private async ensureOwned(companyId: string, id: string) {
    const found = await this.prisma.employee.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Employé introuvable.');
  }
}
