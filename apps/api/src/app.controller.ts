import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('test-db')
  async testDb() {
    const count = await this.prisma.post.count();
    return { postsInDb: count };
  }
}
