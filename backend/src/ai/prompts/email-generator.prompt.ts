/**
 * Prompt template for generating personalized job application emails.
 * Uses OpenAI to create professional, contextual email content.
 */

export interface EmailGeneratorContext {
  // Client data
  clientName: string;
  clientLastName: string;
  clientJobTitle: string;
  clientIndustry: string;

  // Couple data
  isCouple: boolean;
  partnerName?: string;
  partnerLastName?: string;

  // Job offer data
  offerPosition: string;
  offerCompany: string;
  offerCity: string;
  offerCountry: string;
  offerDescription?: string;
}

export const EMAIL_GENERATOR_SYSTEM_PROMPT = `Eres un asistente experto en redacción de emails profesionales de candidatura laboral para el sector hotelero y hostelería. Tu tarea es generar emails personalizados, profesionales y convincentes en español.

REGLAS ESTRICTAS:
1. Siempre escribe en español, independientemente del idioma de la descripción del puesto
2. Mantén un tono profesional pero cercano
3. NUNCA inventes información sobre el candidato
4. El email debe ser conciso: máximo 3 párrafos cortos
5. NO incluyas saludos genéricos como "Estimado/a señor/a"
6. Usa el nombre de la empresa si está disponible
7. Menciona el puesto específico al que se aplica
8. NO incluyas despedidas como "Atentamente" o firmas - eso se añade automáticamente
9. Si es una PAREJA/MATRIMONIO: escribe en primera persona del plural ("Somos...", "Nos dirigimos...", "Contamos con..."). Menciona AMBOS nombres al inicio. Indica que ambos adjuntan su CV.
10. Si es una persona INDIVIDUAL: escribe en primera persona del singular como habitualmente.

ESTRUCTURA DEL EMAIL (INDIVIDUAL):
- Párrafo 1: Expresar interés específico en el puesto y la empresa
- Párrafo 2: Breve mención de experiencia relevante en el sector
- Párrafo 3: Disponibilidad y deseo de aportar valor

ESTRUCTURA DEL EMAIL (PAREJA):
- Párrafo 1: Presentarse como pareja/matrimonio, mencionar ambos nombres y expresar interés en el puesto y la empresa
- Párrafo 2: Breve mención de experiencia combinada en el sector
- Párrafo 3: Disponibilidad conjunta y deseo de aportar valor como equipo

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "subject": "Asunto del email (máximo 60 caracteres)",
  "body": "Cuerpo del email sin formato HTML, solo texto plano con saltos de línea"
}`;

export function buildEmailGeneratorPrompt(context: EmailGeneratorContext): string {
  const description = context.offerDescription
    ? `\nDescripción del puesto:\n${context.offerDescription.substring(0, 500)}${context.offerDescription.length > 500 ? '...' : ''}`
    : '';

  const candidatoSection = context.isCouple
    ? `CANDIDATOS (PAREJA/MATRIMONIO):
- Nombre 1: ${context.clientName} ${context.clientLastName}
- Nombre 2: ${context.partnerName} ${context.partnerLastName}
- Puesto objetivo: ${context.clientJobTitle || 'Profesionales del sector hotelero'}
- Sector de experiencia: ${context.clientIndustry || 'Hotelero y hostelería'}
- IMPORTANTE: Ambos buscan oportunidades juntos. Escribe en primera persona del plural.`
    : `CANDIDATO:
- Nombre: ${context.clientName} ${context.clientLastName}
- Puesto objetivo: ${context.clientJobTitle || 'Profesional del sector hotelero'}
- Sector de experiencia: ${context.clientIndustry || 'Hotelero y hostelería'}`;

  return `Genera un email de candidatura para:

${candidatoSection}

OFERTA DE TRABAJO:
- Puesto: ${context.offerPosition}
- Empresa: ${context.offerCompany || 'la empresa'}
- Ubicación: ${context.offerCity}${context.offerCountry ? `, ${context.offerCountry}` : ''}${description}

Genera el email en español siguiendo las instrucciones del sistema.`;
}

export interface GeneratedEmailContent {
  subject: string;
  body: string;
}
