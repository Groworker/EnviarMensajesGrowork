import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { google } from 'googleapis';
import { createGoogleAuth } from '../common/utils/google-auth.util';

@Injectable()
export class GoogleWorkspaceService {
    private readonly logger = new Logger(GoogleWorkspaceService.name);

    /**
     * Delete a user from Google Workspace
     * @param email The email address of the user to delete
     * @throws NotFoundException if user doesn't exist
     * @throws Error if deletion fails
     */
    async deleteUser(email: string): Promise<void> {
        this.logger.log(`Attempting to delete Google Workspace user: ${email}`);

        try {
            // Create auth client with Admin Directory API scope
            const auth = createGoogleAuth({
                scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
                subject: process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL, // Admin email for impersonation
            });

            const admin = google.admin({ version: 'directory_v1', auth });

            // First check if user exists
            const userExists = await this.checkUserExists(email);
            if (!userExists) {
                this.logger.warn(`User ${email} does not exist in Google Workspace`);
                throw new NotFoundException(
                    `User ${email} not found in Google Workspace`,
                );
            }

            // Delete the user
            await admin.users.delete({
                userKey: email,
            });

            this.logger.log(
                `Successfully deleted Google Workspace user: ${email}`,
            );
        } catch (error: any) {
            if (error instanceof NotFoundException) {
                throw error;
            }

            // Handle specific Google API errors
            if (error.code === 404) {
                throw new NotFoundException(
                    `User ${email} not found in Google Workspace`,
                );
            }

            if (error.code === 403) {
                this.logger.error(
                    `Permission denied while deleting user ${email}. Check domain-wide delegation and admin permissions.`,
                );
                throw new Error(
                    `Permission denied: Service account lacks Admin Directory API permissions. Error: ${error.message}`,
                );
            }

            this.logger.error(
                `Failed to delete Google Workspace user ${email}: ${error.message}`,
                error.stack,
            );
            throw new Error(
                `Failed to delete user from Google Workspace: ${error.message}`,
            );
        }
    }

    /**
     * Check if a user exists in Google Workspace
     * @param email The email address to check
     * @returns true if user exists, false otherwise
     */
    async checkUserExists(email: string): Promise<boolean> {
        try {
            const auth = createGoogleAuth({
                scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
                subject: process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL,
            });

            const admin = google.admin({ version: 'directory_v1', auth });

            await admin.users.get({
                userKey: email,
            });

            return true;
        } catch (error: any) {
            if (error.code === 404) {
                return false;
            }

            // For other errors, log and return false
            this.logger.warn(
                `Error checking if user ${email} exists: ${error.message}`,
            );
            return false;
        }
    }

    /**
     * Get user information from Google Workspace
     * @param email The email address to retrieve
     * @returns User information or null if not found
     */
    async getUserInfo(email: string): Promise<any | null> {
        try {
            const auth = createGoogleAuth({
                scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
                subject: process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL,
            });

            const admin = google.admin({ version: 'directory_v1', auth });

            const response = await admin.users.get({
                userKey: email,
            });

            return response.data;
        } catch (error: any) {
            if (error.code === 404) {
                return null;
            }

            this.logger.error(
                `Failed to get user info for ${email}: ${error.message}`,
            );
            return null;
        }
    }
}
