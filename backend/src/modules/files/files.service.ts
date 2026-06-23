import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { promises as fs, createReadStream } from 'fs';
import { join, resolve } from 'path';
import { LinkedEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ALLOWED_MIME } from './files.constants';
import { sanitizeFilename } from '../../common/utils';

const STORAGE_DIR = process.env.FILE_STORAGE_DIR ?? '/app/storage';

interface SaveInput {
  companyId: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  linkedType?: LinkedEntityType;
  linkedId?: string;
  uploadedById?: string;
}

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveInput) {
    if (!ALLOWED_MIME[input.mimeType]) {
      throw new BadRequestException('Type de fichier non autorisé.');
    }
    const ext = ALLOWED_MIME[input.mimeType];
    const safeName = sanitizeFilename(input.originalName);
    // Partition storage by company to keep tenants separated on disk too.
    const dir = join(STORAGE_DIR, input.companyId);
    await fs.mkdir(dir, { recursive: true });
    const storageKey = join(
      input.companyId,
      `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`,
    );
    const absolute = join(STORAGE_DIR, storageKey);
    await fs.writeFile(absolute, input.buffer);

    const checksum = createHash('sha256').update(input.buffer).digest('hex');

    return this.prisma.fileObject.create({
      data: {
        companyId: input.companyId,
        storageKey,
        originalName: safeName,
        mimeType: input.mimeType,
        size: input.buffer.length,
        checksum,
        linkedType: input.linkedType,
        linkedId: input.linkedId,
        uploadedByType: 'CLIENT',
        uploadedById: input.uploadedById,
      },
    });
  }

  async metadata(companyId: string, id: string) {
    const file = await this.prisma.fileObject.findFirst({
      where: { id, companyId },
    });
    if (!file) throw new NotFoundException('Fichier introuvable.');
    return file;
  }

  async listFor(
    companyId: string,
    linkedType: LinkedEntityType,
    linkedId: string,
  ) {
    return this.prisma.fileObject.findMany({
      where: { companyId, linkedType, linkedId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Returns a readable stream + metadata, after verifying tenant ownership and
  // guarding against path traversal.
  async stream(companyId: string, id: string) {
    const file = await this.metadata(companyId, id);
    const absolute = resolve(join(STORAGE_DIR, file.storageKey));
    if (!absolute.startsWith(resolve(STORAGE_DIR))) {
      throw new BadRequestException('Chemin de fichier invalide.');
    }
    try {
      await fs.access(absolute);
    } catch {
      throw new NotFoundException('Fichier manquant sur le disque.');
    }
    return { file, stream: createReadStream(absolute) };
  }

  async remove(companyId: string, id: string) {
    const file = await this.metadata(companyId, id);
    const absolute = resolve(join(STORAGE_DIR, file.storageKey));
    await this.prisma.fileObject.delete({ where: { id } });
    try {
      if (absolute.startsWith(resolve(STORAGE_DIR))) await fs.unlink(absolute);
    } catch {
      /* file already gone — ignore */
    }
    return { ok: true };
  }
}
