import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../integrations/email.service';
import {
  EMAIL_TEMPLATES,
  getTemplateDef,
  renderTemplate,
  sampleValues,
} from './email-templates.catalog';

export class UpdateTemplateDto {
  @IsString() @MinLength(1) subject!: string;
  @IsString() @MinLength(1) html!: string;
}

export class TestTemplateDto {
  @IsEmail() to!: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() html?: string;
}

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger('EmailTemplates');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // Ensure every catalog template has a stored row (defaults), without
  // overwriting templates the admin already customized.
  async onModuleInit() {
    try {
      for (const def of EMAIL_TEMPLATES) {
        const existing = await this.prisma.emailTemplate.findUnique({
          where: { key: def.key },
        });
        if (!existing) {
          await this.prisma.emailTemplate.create({
            data: {
              key: def.key,
              subject: def.defaultSubject,
              html: def.defaultHtml,
            },
          });
        }
      }
    } catch (e) {
      this.logger.warn(`Could not seed email templates: ${(e as Error).message}`);
    }
  }

  // List all templates with their stored content + catalog metadata (tags…).
  async list() {
    const stored = await this.prisma.emailTemplate.findMany();
    const byKey = new Map(stored.map((s) => [s.key, s]));
    return EMAIL_TEMPLATES.map((def) => {
      const row = byKey.get(def.key);
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        tags: def.tags,
        subject: row?.subject ?? def.defaultSubject,
        html: row?.html ?? def.defaultHtml,
        sampleValues: sampleValues(def),
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  async update(key: string, dto: UpdateTemplateDto) {
    const def = getTemplateDef(key);
    if (!def) throw new NotFoundException('Modèle inconnu.');
    return this.prisma.emailTemplate.upsert({
      where: { key },
      update: { subject: dto.subject, html: dto.html },
      create: { key, subject: dto.subject, html: dto.html },
    });
  }

  // Reset a template back to its catalog default.
  async reset(key: string) {
    const def = getTemplateDef(key);
    if (!def) throw new NotFoundException('Modèle inconnu.');
    return this.prisma.emailTemplate.upsert({
      where: { key },
      update: { subject: def.defaultSubject, html: def.defaultHtml },
      create: { key, subject: def.defaultSubject, html: def.defaultHtml },
    });
  }

  // Send a test email for a template, rendered with sample tag values.
  async test(key: string, dto: TestTemplateDto) {
    const def = getTemplateDef(key);
    if (!def) throw new NotFoundException('Modèle inconnu.');

    // Prefer the subject/html passed from the editor; fall back to stored row.
    let subject = dto.subject;
    let html = dto.html;
    if (subject == null || html == null) {
      const row = await this.prisma.emailTemplate.findUnique({ where: { key } });
      subject = subject ?? row?.subject ?? def.defaultSubject;
      html = html ?? row?.html ?? def.defaultHtml;
    }

    const values = sampleValues(def);
    const result = await this.email.send(
      dto.to,
      renderTemplate(subject, values),
      renderTemplate(html, values),
    );
    return {
      ok: true,
      mock: result.mock,
      id: result.id,
      message: result.mock
        ? "Mode démo : aucune clé Resend configurée, l'email n'a pas été réellement envoyé (voir les logs serveur)."
        : `Email de test « ${def.label} » envoyé à ${dto.to}.`,
    };
  }
}
