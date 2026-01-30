import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  EMAIL_GENERATOR_SYSTEM_PROMPT,
  buildEmailGeneratorPrompt,
  EmailGeneratorContext,
  GeneratedEmailContent,
} from './prompts/email-generator.prompt';
import {
  RESPONSE_CLASSIFIER_SYSTEM_PROMPT,
  buildResponseClassifierPrompt,
  ResponseClassifierContext,
  ClassificationResult,
} from './prompts/response-classifier.prompt';
import { Client } from '../entities/client.entity';
import { JobOffer } from '../entities/job-offer.entity';
import { ResponseClassification } from '../entities/email-response.entity';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    this.maxTokens =
      this.configService.get<number>('OPENAI_MAX_TOKENS') || 1000;

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log(`AI Service initialized with model: ${this.model}`);
    } else {
      this.logger.warn(
        'OpenAI API key not configured. AI email generation will be disabled.',
      );
    }
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Generate personalized email content for a job application
   */
  async generateEmailContent(
    client: Client,
    offer: JobOffer,
  ): Promise<{ subject: string; htmlContent: string; model: string }> {
    if (!this.openai) {
      this.logger.warn('AI not available, using fallback template');
      return this.generateFallbackContent(client, offer);
    }

    const context: EmailGeneratorContext = {
      clientName: client.nombre || '',
      clientLastName: client.apellido || '',
      clientJobTitle: client.jobTitle || '',
      clientIndustry: client.industria || 'hotelero',
      offerPosition: offer.puesto || 'el puesto disponible',
      offerCompany: offer.empresa || offer.hotel || '',
      offerCity: offer.ciudad || '',
      offerCountry: offer.pais || '',
      offerDescription: offer.textoOferta || '',
    };

    try {
      const userPrompt = buildEmailGeneratorPrompt(context);

      this.logger.debug(`Generating email for client ${client.id} to ${offer.email}`);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: EMAIL_GENERATOR_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      const generated = this.parseAiResponse(responseText);
      const htmlContent = this.convertToHtml(generated.body, client);

      this.logger.log(
        `Email generated successfully for client ${client.id}. ` +
          `Tokens used: ${completion.usage?.total_tokens || 'unknown'}`,
      );

      return {
        subject: generated.subject,
        htmlContent,
        model: this.model,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate email with AI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Fall back to template-based generation
      return this.generateFallbackContent(client, offer);
    }
  }

  /**
   * Parse the AI response JSON
   */
  private parseAiResponse(responseText: string): GeneratedEmailContent {
    try {
      const parsed = JSON.parse(responseText);

      if (!parsed.subject || !parsed.body) {
        throw new Error('Missing required fields in AI response');
      }

      return {
        subject: parsed.subject.trim(),
        body: parsed.body.trim(),
      };
    } catch {
      this.logger.error('Failed to parse AI response as JSON');
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Convert plain text body to styled HTML email
   */
  private convertToHtml(body: string, client: Client): string {
    const clientName = `${client.nombre || ''} ${client.apellido || ''}`.trim();
    const clientEmail = client.emailOperativo || client.email || '';
    const clientPhone = client.phone || '';

    // Convert line breaks to paragraphs
    const paragraphs = body
      .split(/\n\n+/)
      .filter((p) => p.trim())
      .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #333333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              ${paragraphs}

              <!-- Signature -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 24px; border-top: 1px solid #eeeeee; padding-top: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-weight: bold; color: #333333;">${clientName}</p>
                    ${clientEmail ? `<p style="margin: 0 0 4px 0; color: #666666;">${clientEmail}</p>` : ''}
                    ${clientPhone ? `<p style="margin: 0; color: #666666;">${clientPhone}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 40px; background-color: #f9f9f9; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 11px; color: #999999; text-align: center;">
                Este email ha sido enviado como parte de una candidatura laboral.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  }

  /**
   * Fallback template when AI is not available
   */
  private generateFallbackContent(
    client: Client,
    offer: JobOffer,
  ): { subject: string; htmlContent: string; model: string } {
    const clientName = `${client.nombre || ''} ${client.apellido || ''}`.trim();
    const position = offer.puesto || 'el puesto disponible';
    const company = offer.empresa || offer.hotel || 'su empresa';
    const location = `${offer.ciudad || ''}${offer.pais ? `, ${offer.pais}` : ''}`;
    const industry = client.industria || 'hotelero';

    const subject = `Candidatura para ${position} - ${clientName}`;

    const body = `Me dirijo a ustedes para expresar mi interés en la posición de ${position} en ${company}${location ? ` ubicada en ${location}` : ''}.

Cuento con experiencia en el sector ${industry} y me gustaría tener la oportunidad de formar parte de su equipo. Adjunto mi currículum para su consideración.

Quedo a su disposición para ampliar cualquier información y participar en el proceso de selección cuando lo consideren oportuno.`;

    const htmlContent = this.convertToHtml(body, client);

    return {
      subject,
      htmlContent,
      model: 'fallback-template',
    };
  }

  /**
   * Classify an email response using AI
   */
  async classifyResponse(
    responseSubject: string,
    responseBody: string,
    originalSubject?: string,
    originalRecipient?: string,
  ): Promise<{
    classification: ResponseClassification;
    confidence: number;
    reasoning: string;
  }> {
    // Default response if AI is not available
    const defaultResult = {
      classification: ResponseClassification.SIN_CLASIFICAR,
      confidence: 0,
      reasoning: 'AI no disponible para clasificación',
    };

    if (!this.openai) {
      this.logger.warn('AI not available for classification');
      return defaultResult;
    }

    // Skip classification for very short responses
    if (!responseBody || responseBody.trim().length < 10) {
      return {
        classification: ResponseClassification.SIN_CLASIFICAR,
        confidence: 0.5,
        reasoning: 'Respuesta demasiado corta para clasificar',
      };
    }

    const context: ResponseClassifierContext = {
      responseSubject,
      responseBody: responseBody.substring(0, 2000), // Limit body length
      originalSubject,
      originalRecipient,
    };

    try {
      const userPrompt = buildResponseClassifierPrompt(context);

      this.logger.debug(`Classifying response: "${responseSubject}"`);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: RESPONSE_CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.3, // Lower temperature for more consistent classification
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = this.parseClassificationResponse(responseText);

      this.logger.log(
        `Response classified as "${parsed.classification}" (${Math.round(parsed.confidence * 100)}% confidence). ` +
          `Tokens: ${completion.usage?.total_tokens || 'unknown'}`,
      );

      return parsed;
    } catch (error) {
      this.logger.error(
        `Failed to classify response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return defaultResult;
    }
  }

  /**
   * Parse the classification response from AI
   */
  private parseClassificationResponse(responseText: string): {
    classification: ResponseClassification;
    confidence: number;
    reasoning: string;
  } {
    try {
      const parsed = JSON.parse(responseText) as ClassificationResult;

      // Validate classification
      const validClassifications = [
        'negativa',
        'automatica',
        'entrevista',
        'mas_informacion',
        'contratado',
      ];

      let classification = ResponseClassification.SIN_CLASIFICAR;
      if (validClassifications.includes(parsed.classification)) {
        classification = parsed.classification as ResponseClassification;
      }

      // Validate confidence
      let confidence = 0.5;
      if (
        typeof parsed.confidence === 'number' &&
        parsed.confidence >= 0 &&
        parsed.confidence <= 1
      ) {
        confidence = parsed.confidence;
      }

      return {
        classification,
        confidence,
        reasoning: parsed.reasoning || 'Sin explicación',
      };
    } catch {
      this.logger.error('Failed to parse classification response as JSON');
      return {
        classification: ResponseClassification.SIN_CLASIFICAR,
        confidence: 0,
        reasoning: 'Error al parsear respuesta de IA',
      };
    }
  }
}
