import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      status: 'ok',
    };
  }

  @Get('data')
  getHealthData() {
    return {
      data: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      },
      message: 'Health data retrieved successfully',
    };
  }

  @Get('error')
  getHealthError() {
    throw new Error('Test error for response interceptor');
  }
}
