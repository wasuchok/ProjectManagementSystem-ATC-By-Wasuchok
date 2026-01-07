import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const settings = await this.prisma.system_setting.findMany();
    // Convert array to object for easier frontend consumption
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  }

  async update(updateSettingDto: UpdateSettingDto) {
    return this.prisma.system_setting.upsert({
      where: { key: updateSettingDto.key },
      update: {
        value: updateSettingDto.value,
        description: updateSettingDto.description,
      },
      create: {
        key: updateSettingDto.key,
        value: updateSettingDto.value,
        description: updateSettingDto.description,
      },
    });
  }

  async updateLogo(filename: string) {
    // Assuming the server is serving static files from /uploads
    const logoUrl = `/uploads/images/system/${filename}`;
    return this.prisma.system_setting.upsert({
      where: { key: 'logo_url' },
      update: { value: logoUrl },
      create: { key: 'logo_url', value: logoUrl, description: 'System Logo URL' },
    });
  }
}
