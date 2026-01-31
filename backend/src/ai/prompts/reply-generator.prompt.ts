export interface ReplyGeneratorContext {
  // Email original enviado
  originalSubject: string;
  originalRecipient: string;
  originalRecipientName?: string;

  // Respuesta recibida
  responseSubject: string;
  responseBody: string;
  responseClassification: string;

  // Contexto del cliente y oferta
  clientName: string;
  clientLastName: string;
  clientJobTitle?: string;
  jobPosition?: string;
  jobCompany?: string;
  jobCity?: string;
}

export const REPLY_GENERATOR_SYSTEM_PROMPT = `Eres un asistente experto en redacción de respuestas profesionales para candidaturas laborales en el sector hotelero y hostelería.

Tu tarea es generar una respuesta apropiada basándote en:
1. El contexto de la candidatura original
2. La respuesta recibida de la empresa
3. La clasificación de esa respuesta

REGLAS ESTRICTAS:
1. Escribe siempre en español
2. Mantén un tono profesional pero cordial
3. Adapta el contenido según la clasificación:
   - "entrevista": Confirmar disponibilidad, agradecer la oportunidad, mostrar entusiasmo
   - "mas_informacion": Proporcionar la información solicitada de forma clara, ofrecer enviar más detalles
   - "negativa": Agradecer la consideración, mantener la puerta abierta para futuras oportunidades
   - "automatica": Respuesta de seguimiento cortés preguntando por el estado de la candidatura
   - "contratado": Agradecer efusivamente, confirmar interés, preguntar por siguientes pasos y documentación
   - "sin_clasificar": Respuesta neutral y profesional solicitando más información
4. NO inventes información específica que no tengas (certificaciones, títulos, etc.)
5. Máximo 3 párrafos cortos
6. NO incluyas firma ni despedida formal - se añadirá automáticamente
7. Usa un lenguaje natural y cercano, evitando frases muy formales o anticuadas

ESTRUCTURA RECOMENDADA:
- Párrafo 1: Agradecimiento por la respuesta y referencia al contexto
- Párrafo 2: Contenido principal según la clasificación
- Párrafo 3: Cierre con disponibilidad o siguiente paso

FORMATO DE RESPUESTA (JSON estricto):
{
  "subject": "Re: [asunto original o adaptado según contexto]",
  "body": "Texto de la respuesta en formato plano (sin HTML)"
}`;

export function buildReplyGeneratorPrompt(
  context: ReplyGeneratorContext,
): string {
  const parts: string[] = [];

  parts.push('CONTEXTO DE LA CANDIDATURA:');
  parts.push(`- Candidato: ${context.clientName} ${context.clientLastName}`);

  if (context.clientJobTitle) {
    parts.push(`- Puesto objetivo del candidato: ${context.clientJobTitle}`);
  }

  if (context.jobCompany) {
    parts.push(`- Empresa contactada: ${context.jobCompany}`);
  }

  if (context.jobPosition) {
    parts.push(`- Puesto de la oferta: ${context.jobPosition}`);
  }

  if (context.jobCity) {
    parts.push(`- Ubicación: ${context.jobCity}`);
  }

  parts.push('');
  parts.push('EMAIL ORIGINAL ENVIADO:');
  parts.push(`- Asunto: ${context.originalSubject}`);
  parts.push(
    `- Destinatario: ${context.originalRecipientName || context.originalRecipient}`,
  );

  parts.push('');
  parts.push(
    `RESPUESTA RECIBIDA (Clasificación: ${context.responseClassification}):`,
  );
  parts.push(`- Asunto: ${context.responseSubject}`);
  parts.push('- Contenido:');
  parts.push(context.responseBody.substring(0, 2000));

  parts.push('');
  parts.push('---');
  parts.push(
    'Genera una respuesta apropiada y profesional para esta situación.',
  );

  return parts.join('\n');
}
