import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('pipeline')
    async getClientPipeline() {
        const pipeline = await this.dashboardService.getClientPipeline();
        return { pipeline };
    }

    @Get('email-stats')
    async getEmailStats(@Query('days', ParseIntPipe) days = 30) {
        const stats = await this.dashboardService.getEmailStats(days);
        return { stats };
    }

    @Get('recent-activity')
    async getRecentActivity(@Query('limit', ParseIntPipe) limit = 20) {
        const activity = await this.dashboardService.getRecentActivity(limit);
        return { activity };
    }

    @Get('kpis')
    async getKPIs() {
        const kpis = await this.dashboardService.getKPIs();
        return { kpis };
    }

    @Get('eligible-for-deletion')
    async getEligibleForDeletion() {
        const clients = await this.dashboardService.getEligibleForDeletion();
        return { clients, count: clients.length };
    }
}
