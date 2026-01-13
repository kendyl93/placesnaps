import { Body, Controller, Get, Post } from '@nestjs/common';
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

  @Post('posts')
  async createPost(
    @Body() body: { lat: number; lng: number; mediaUrl?: string },
  ) {
    const post = await this.prisma.post.create({
      data: {
        lat: body.lat,
        lng: body.lng,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        mediaUrl: body.mediaUrl ?? null,
      },
    });

    return post;
  }

  @Get('feed')
  async feed() {
    return this.prisma.post.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
