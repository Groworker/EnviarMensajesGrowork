import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
}

/**
 * Interface representing a Zoho CRM Contact
 * Field names match Zoho API field names exactly
 */
export interface ZohoContact {
  id: string;
  Modified_Time: string;
  First_Name: string | null;
  Last_Name: string | null;
  Email: string | null;
  Phone: string | null;
  Estado_del_cliente: string | null;
  Motivo_de_cierre: string | null;
  Email_operativo: string | null;
  Industria: string | null;
  Puesto_objetivo: string | null;
  Pa_ses_de_inter_s: string[] | null;
  Ciudad_objetivo: string[] | null;
  id_CARPETA_CLIENTE: string | null;
  id_CARPETA_DEFINITIVA: string | null;
  id_CARPETA_NEW: string | null;
  id_CARPETA_OLD: string | null;
}

/**
 * Interface for Zoho CRM search/list response
 */
export interface ZohoSearchResponse {
  data: ZohoContact[] | null;
  info: {
    per_page: number;
    count: number;
    page: number;
    more_records: boolean;
  };
}

@Injectable()
export class ZohoService {
  private readonly logger = new Logger(ZohoService.name);
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // Zoho API configuration
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly apiDomain: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('ZOHO_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('ZOHO_CLIENT_SECRET') || '';
    this.refreshToken =
      this.configService.get<string>('ZOHO_REFRESH_TOKEN') || '';
    this.apiDomain =
      this.configService.get<string>('ZOHO_API_DOMAIN') ||
      'https://www.zohoapis.com';

    this.axiosInstance = axios.create({
      baseURL: this.apiDomain,
      timeout: 10000,
    });
  }

  /**
   * Get accounts domain based on API domain
   */
  private getAccountsDomain(): string {
    // Extract region from API domain
    // https://www.zohoapis.eu -> https://accounts.zoho.eu
    // https://www.zohoapis.com -> https://accounts.zoho.com
    if (this.apiDomain.includes('.eu')) {
      return 'https://accounts.zoho.eu';
    } else if (this.apiDomain.includes('.com.au')) {
      return 'https://accounts.zoho.com.au';
    } else if (this.apiDomain.includes('.in')) {
      return 'https://accounts.zoho.in';
    } else if (this.apiDomain.includes('.com.cn')) {
      return 'https://accounts.zoho.com.cn';
    } else {
      return 'https://accounts.zoho.com'; // Default US
    }
  }

  /**
   * Get or refresh access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 5-minute buffer)
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 5 * 60 * 1000) {
      return this.accessToken;
    }

    // Refresh token
    try {
      const accountsDomain = this.getAccountsDomain();
      const tokenUrl = `${accountsDomain}/oauth/v2/token`;
      this.logger.log(`Using accounts domain: ${accountsDomain}`);

      const params = new URLSearchParams({
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      });

      const response = await axios.post<ZohoTokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const newAccessToken = response.data.access_token;
      this.accessToken = newAccessToken;
      this.tokenExpiresAt = now + response.data.expires_in * 1000;

      this.logger.log('Zoho access token refreshed successfully');
      return newAccessToken;
    } catch (error: any) {
      this.logger.error('Failed to refresh Zoho access token', error.message);
      throw new Error('Failed to authenticate with Zoho CRM');
    }
  }

  /**
   * Update client status in Zoho CRM
   */
  async updateClientEstado(
    zohoId: string,
    nuevoEstado: string,
    motivoCierre?: string | null,
  ): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      // Zoho CRM API endpoint to update a contact
      const updateUrl = `/crm/v2/Contacts/${zohoId}`;

      const contactData: Record<string, string> = {
        Estado_del_cliente: nuevoEstado,
      };

      // Include Motivo_de_cierre when closing, or clear it when not Closed
      if (nuevoEstado === 'Closed' && motivoCierre) {
        contactData.Motivo_de_cierre = motivoCierre;
      } else if (nuevoEstado !== 'Closed') {
        contactData.Motivo_de_cierre = '';
      }

      const requestBody = {
        data: [contactData],
      };

      const response = await this.axiosInstance.put(updateUrl, requestBody, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.data && response.data.data[0].code === 'SUCCESS') {
        this.logger.log(
          `Successfully updated estado for Zoho contact ${zohoId} to "${nuevoEstado}"`,
        );
      } else {
        this.logger.warn(
          `Unexpected response when updating Zoho contact ${zohoId}:`,
          response.data,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to update estado in Zoho for contact ${zohoId}`,
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to update estado in Zoho CRM: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get client details from Zoho CRM
   */
  async getContact(zohoId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const contactUrl = `/crm/v2/Contacts/${zohoId}`;

      const response = await this.axiosInstance.get(contactUrl, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });

      return response.data.data[0];
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch contact ${zohoId} from Zoho`,
        error.response?.data || error.message,
      );
      throw new Error('Failed to fetch contact from Zoho CRM');
    }
  }

  /**
   * Fields to fetch from Zoho CRM for sync
   */
  private readonly syncFields = [
    'id',
    'Modified_Time',
    'First_Name',
    'Last_Name',
    'Email',
    'Phone',
    'Estado_del_cliente',
    'Email_operativo',
    'Industria',
    'Puesto_objetivo',
    'Pa_ses_de_inter_s',
    'Ciudad_objetivo',
    'id_CARPETA_CLIENTE',
    'id_CARPETA_DEFINITIVA',
    'id_CARPETA_NEW',
    'id_CARPETA_OLD',
  ].join(',');

  /**
   * Search contacts modified since a given timestamp (for delta sync)
   * Uses Zoho CRM Records API with If-Modified-Since header
   */
  async searchModifiedContacts(
    modifiedSince: Date,
    page: number = 1,
    perPage: number = 200,
  ): Promise<ZohoSearchResponse> {
    try {
      const accessToken = await this.getAccessToken();

      // Format date for Zoho If-Modified-Since header: ISO 8601 format
      const formattedDate = modifiedSince.toISOString();

      const response = await this.axiosInstance.get('/crm/v2/Contacts', {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'If-Modified-Since': formattedDate,
        },
        params: {
          fields: this.syncFields,
          page,
          per_page: perPage,
        },
      });

      // Zoho returns 204 No Content when no records found
      if (response.status === 204 || !response.data) {
        return {
          data: null,
          info: {
            per_page: perPage,
            count: 0,
            page,
            more_records: false,
          },
        };
      }

      return response.data as ZohoSearchResponse;
    } catch (error: any) {
      // 304 Not Modified or 204 No Content means no changes
      if (error.response?.status === 304 || error.response?.status === 204) {
        return {
          data: null,
          info: {
            per_page: perPage,
            count: 0,
            page,
            more_records: false,
          },
        };
      }

      this.logger.error(
        'Failed to search modified contacts in Zoho',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to search Zoho contacts: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get all contacts from Zoho CRM (for full sync)
   * Uses pagination to handle large datasets
   */
  async getAllContacts(
    page: number = 1,
    perPage: number = 200,
  ): Promise<ZohoSearchResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await this.axiosInstance.get('/crm/v2/Contacts', {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
        params: {
          fields: this.syncFields,
          page,
          per_page: perPage,
        },
      });

      // Zoho returns 204 No Content when no records found
      if (response.status === 204 || !response.data) {
        return {
          data: null,
          info: {
            per_page: perPage,
            count: 0,
            page,
            more_records: false,
          },
        };
      }

      return response.data as ZohoSearchResponse;
    } catch (error: any) {
      if (error.response?.status === 204) {
        return {
          data: null,
          info: {
            per_page: perPage,
            count: 0,
            page,
            more_records: false,
          },
        };
      }

      this.logger.error(
        'Failed to fetch all contacts from Zoho',
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to fetch Zoho contacts: ${error.response?.data?.message || error.message}`,
      );
    }
  }
}
