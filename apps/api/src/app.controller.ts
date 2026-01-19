import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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

  haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  @Get('feed')
  async feed(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const userLat = lat ? Number(lat) : null;
    const userLng = lng ? Number(lng) : null;

    const posts = await this.prisma.post.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // brak lokacji użytkownika -> klasycznie
    if (
      userLat === null ||
      userLng === null ||
      Number.isNaN(userLat) ||
      Number.isNaN(userLng)
    ) {
      return posts;
    }

    // sortuj po dystansie, a te bez lokacji na dół
    const sorted = [...posts].sort((a, b) => {
      const aHas = a.lat !== 0 || a.lng !== 0;
      const bHas = b.lat !== 0 || b.lng !== 0;

      if (!aHas && !bHas) return 0;
      if (!aHas) return 1;
      if (!bHas) return -1;

      const da = this.haversineKm(userLat, userLng, a.lat, a.lng);
      const db = this.haversineKm(userLat, userLng, b.lat, b.lng);
      return da - db;
    });

    return sorted;
  }
}
