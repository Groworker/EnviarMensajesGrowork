import { Controller, Post } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

@Controller('api/scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('trigger')
  async triggerDailyJobs() {
    await this.schedulerService.handleDailyJobCreation();
    return { message: 'Daily jobs triggered manually' };
  }
}
