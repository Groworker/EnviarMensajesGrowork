import { Controller, Get, Delete, Param, Post } from '@nestjs/common';
import { CorporateEmailsService } from './corporate-emails.service';

@Controller('corporate-emails')
export class CorporateEmailsController {
    constructor(
        private readonly corporateEmailsService: CorporateEmailsService,
    ) { }

    @Get()
    async getAllCorporateEmails() {
        return this.corporateEmailsService.getAllCorporateEmails();
    }

    @Get('stats')
    async getStats() {
        return this.corporateEmailsService.getStats();
    }

    @Get('pending-deletion')
    async getPendingDeletion() {
        return this.corporateEmailsService.getPendingDeletion();
    }

    @Delete(':email')
    async deleteEmail(@Param('email') email: string) {
        await this.corporateEmailsService.deleteEmail(email);
        return { success: true, message: 'Email deleted successfully' };
    }

    @Post(':email/cancel-deletion')
    async cancelDeletion(@Param('email') email: string) {
        await this.corporateEmailsService.cancelDeletion(email);
        return { success: true, message: 'Deletion gracefully cancelled' };
    }
}
