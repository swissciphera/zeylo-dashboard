import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { LinkedEntityType } from '@prisma/client';
import { ClientJwtGuard } from '../../auth/guards/client-jwt.guard';
import {
  CurrentCompany,
  CurrentClient,
} from '../../common/decorators/current-user.decorator';
import { ClientPrincipal } from '../../common/types';
import { FilesService } from './files.service';
import { ALLOWED_MIME, PREVIEWABLE_MIME } from './files.constants';

const MAX_UPLOAD = Number(process.env.MAX_UPLOAD_BYTES ?? 26214400);

@UseGuards(ClientJwtGuard)
@Controller('app/files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME[file.mimetype]) {
          return cb(new BadRequestException('Type de fichier non autorisé.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentCompany() companyId: string,
    @CurrentClient() user: ClientPrincipal,
    @Query('linkedType') linkedType?: LinkedEntityType,
    @Query('linkedId') linkedId?: string,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    return this.files.save({
      companyId,
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      linkedType,
      linkedId,
      uploadedById: user.sub,
    });
  }

  @Get()
  list(
    @CurrentCompany() companyId: string,
    @Query('linkedType') linkedType: LinkedEntityType,
    @Query('linkedId') linkedId: string,
  ) {
    return this.files.listFor(companyId, linkedType, linkedId);
  }

  @Get(':id')
  metadata(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.files.metadata(companyId, id);
  }

  // Inline preview (PDF / image / text) — no download.
  @Get(':id/preview')
  async preview(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { file, stream } = await this.files.stream(companyId, id);
    if (!PREVIEWABLE_MIME.has(file.mimeType)) {
      throw new BadRequestException('Aperçu non disponible pour ce type.');
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    stream.pipe(res);
  }

  @Get(':id/download')
  async download(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { file, stream } = await this.files.stream(companyId, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.originalName}"`,
    );
    stream.pipe(res);
  }

  @Delete(':id')
  remove(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.files.remove(companyId, id);
  }
}
