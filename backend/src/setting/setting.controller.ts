import { Body, Controller, Get, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from '../common/upload/multer-options.factory';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingService } from './setting.service';

@Controller('settings')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get()
  findAll() {
    return this.settingService.findAll();
  }

  @Put()
  update(@Body() updateSettingDto: UpdateSettingDto) {
    return this.settingService.update(updateSettingDto);
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file', createMulterOptions('system')))
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    return this.settingService.updateLogo(file.filename);
  }
}
