import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

export interface GoogleAuthOptions {
  scopes: string[];
  subject?: string; // For domain-wide delegation (impersonation)
}

/**
 * Creates a Google Auth client that works with both:
 * 1. GOOGLE_CREDENTIALS_JSON environment variable (for production/Docker)
 * 2. google-creds.json file (for local development)
 */
export function createGoogleAuth(options: GoogleAuthOptions) {
  const { scopes, subject } = options;

  // Try to get credentials from environment variable first
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

  if (credentialsJson) {
    // Parse credentials from environment variable
    try {
      const credentials = JSON.parse(credentialsJson);
      return new google.auth.GoogleAuth({
        credentials,
        scopes,
        clientOptions: subject ? { subject } : undefined,
      });
    } catch (error) {
      throw new Error(
        `Failed to parse GOOGLE_CREDENTIALS_JSON: ${error.message}`,
      );
    }
  }

  // Fall back to file-based credentials for local development
  const keyFilePath = path.join(process.cwd(), 'google-creds.json');

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(
      'Google credentials not found. Set GOOGLE_CREDENTIALS_JSON environment variable or place google-creds.json in the project root.',
    );
  }

  return new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes,
    clientOptions: subject ? { subject } : undefined,
  });
}
