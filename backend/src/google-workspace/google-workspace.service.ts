import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, admin_directory_v1 } from 'googleapis';
import { createGoogleAuth } from '../common/utils/google-auth.util.js';

@Injectable()
export class GoogleWorkspaceService {
    private readonly logger = new Logger(GoogleWorkspaceService.name);
    private _adminClient: admin_directory_v1.Admin | null = null;
    private initializationError: string | null = null;

    constructor(private readonly configService: ConfigService) { }

    /**
     * Creates or returns the authenticated Google Admin Directory client
     */
    private getAdminClient(): admin_directory_v1.Admin {
        if (this._adminClient) return this._adminClient;

        if (this.initializationError) {
            throw new Error(`Google Workspace Admin SDK not configured correctly: ${this.initializationError}`);
        }

        try {
            const adminEmail = this.configService.get<string>('googleWorkspaceAdminEmail');

            if (!adminEmail) {
                throw new Error('GOOGLE_WORKSPACE_ADMIN_EMAIL is not configured');
            }

            const auth = createGoogleAuth({
                scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
                subject: adminEmail,
            });

            this._adminClient = google.admin({ version: 'directory_v1', auth: auth as any });
            return this._adminClient;
        } catch (error: any) {
            this.initializationError = error.message;
            this.logger.error(`Failed to initialize Google Workspace Admin SDK: ${error.message}`);
            throw error;
        }
    }

    /**
     * Deletes a user from Google Workspace
     * @param email The primary email of the user to delete
     */
    async deleteUser(email: string): Promise<void> {
        try {
            const admin = this.getAdminClient();
            this.logger.log(`Attempting to delete Google Workspace user: ${email}`);

            await admin.users.delete({ userKey: email });

            this.logger.log(`Successfully deleted Google Workspace user: ${email}`);
        } catch (error: any) {
            this.logger.error(`Error deleting Google Workspace user ${email}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Alternative method to suspend a user instead of deleting
     * @param email The primary email of the user
     */
    async suspendUser(email: string): Promise<void> {
        try {
            const admin = this.getAdminClient();
            this.logger.log(`Attempting to suspend Google Workspace user: ${email}`);

            await admin.users.update({
                userKey: email,
                requestBody: {
                    suspended: true,
                },
            });

            this.logger.log(`Successfully suspended Google Workspace user: ${email}`);
        } catch (error: any) {
            this.logger.error(`Error suspending Google Workspace user ${email}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get information about a specific user
     * @param email The primary email of the user
     */
    async getUserInfo(email: string): Promise<admin_directory_v1.Schema$User> {
        try {
            const admin = this.getAdminClient();
            const response = await admin.users.get({ userKey: email });
            return response.data;
        } catch (error: any) {
            this.logger.error(`Error fetching Google Workspace user ${email}: ${error.message}`);
            throw error;
        }
    }

    /**
     * List users in Google Workspace, optionally filtered by domain
     */
    async listUsers(domain?: string): Promise<admin_directory_v1.Schema$User[]> {
        try {
            const admin = this.getAdminClient();
            let users: admin_directory_v1.Schema$User[] = [];
            let pageToken: string | undefined = undefined;

            do {
                const response: any = await admin.users.list({
                    customer: 'my_customer',
                    domain: domain,
                    maxResults: 500,
                    pageToken: pageToken,
                });

                if (response.data.users) {
                    users = users.concat(response.data.users);
                }

                pageToken = response.data.nextPageToken || undefined;
            } while (pageToken);

            return users;
        } catch (error: any) {
            this.logger.error(`Error listing Google Workspace users: ${error.message}`);
            throw error;
        }
    }
}
