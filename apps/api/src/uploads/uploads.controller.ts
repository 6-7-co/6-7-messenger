import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { basename } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StorageService } from './storage.service';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadImage(
    @CurrentUser() _user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.storage.save(file.buffer, file.originalname);
    return { url: result.url, width: result.width, height: result.height, size: result.size };
  }

  @Get('images/:filename')
  async serveImage(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = basename(filename);
    const resolved = await this.storage.resolve(safeName);
    if (!resolved) {
      res.status(404).send();
      return;
    }
    res.sendFile(resolved.path);
  }
}
