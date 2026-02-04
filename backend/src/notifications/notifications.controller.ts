import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Query,
    ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async findAll(
        @Query('limit', ParseIntPipe) limit = 50,
        @Query('offset', ParseIntPipe) offset = 0,
    ) {
        const notifications = await this.notificationsService.findAll(limit, offset);
        return { notifications };
    }

    @Get('unread')
    async findUnread() {
        const notifications = await this.notificationsService.findUnread();
        const count = notifications.length;
        return { notifications, count };
    }

    @Get('unread/count')
    async countUnread() {
        const count = await this.notificationsService.countUnread();
        return { count };
    }

    @Patch(':id/read')
    async markAsRead(@Param('id', ParseIntPipe) id: number) {
        const notification = await this.notificationsService.markAsRead(id);
        return { notification };
    }

    @Patch('read-all')
    async markAllAsRead() {
        await this.notificationsService.markAllAsRead();
        return { message: 'All notifications marked as read' };
    }

    @Delete(':id')
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.notificationsService.delete(id);
        return { message: 'Notification deleted successfully' };
    }
}
