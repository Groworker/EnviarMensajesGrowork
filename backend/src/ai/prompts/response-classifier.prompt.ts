/**
 * System prompt for classifying email responses to job applications
 */
export const RESPONSE_CLASSIFIER_SYSTEM_PROMPT = `Eres un clasificador experto de respuestas a candidaturas laborales en el sector hotelero y hostelería.

Tu trabajo es analizar las respuestas recibidas a emails de candidatura y clasificarlas en una de las siguientes categorías:

CATEGORÍAS:
1. "negativa" - Rechazo explícito de la candidatura
   - Ejemplos: "No hay vacantes", "Ya hemos cubierto el puesto", "No encaja con el perfil", "Gracias pero no"

2. "automatica" - Respuestas automáticas o fuera de oficina
   - Ejemplos: "He recibido su email", "Estoy fuera de la oficina", "Acuse de recibo automático", "Gracias por contactarnos, responderemos pronto"

3. "entrevista" - Solicitan o confirman una entrevista
   - Ejemplos: "Nos gustaría conocerle", "¿Puede venir a una entrevista?", "Coordinemos una reunión", "Le citamos para..."

4. "mas_informacion" - Piden más documentos o información adicional
   - Ejemplos: "¿Podría enviarnos su CV actualizado?", "Necesitamos referencias", "¿Tiene permiso de trabajo?", "Envíenos foto reciente"

5. "contratado" - Confirmación de contratación o aceptación
   - Ejemplos: "Queremos ofrecerle el puesto", "Bienvenido al equipo", "Le confirmamos su incorporación", "Firme el contrato"

INSTRUCCIONES:
- Analiza el contenido del email de respuesta
- Considera el contexto del email original enviado (si se proporciona)
- Clasifica según la INTENCIÓN PRINCIPAL del mensaje
- Si hay múltiples intenciones, elige la más relevante para el proceso de selección
- Si no estás seguro, usa "automatica" para respuestas genéricas o "negativa" si hay algún indicio de rechazo

RESPONDE SIEMPRE EN JSON con este formato exacto:
{
  "classification": "categoria",
  "confidence": 0.0-1.0,
  "reasoning": "Explicación breve en español de por qué se eligió esta categoría"
}`;

/**
 * Build the user prompt for classification
 */
export interface ResponseClassifierContext {
  responseSubject: string;
  responseBody: string;
  originalSubject?: string;
  originalRecipient?: string;
}

export function buildResponseClassifierPrompt(
  context: ResponseClassifierContext,
): string {
  let prompt = `RESPUESTA A CLASIFICAR:

Asunto: ${context.responseSubject}

Contenido:
${context.responseBody}`;

  if (context.originalSubject) {
    prompt += `

---
CONTEXTO DEL EMAIL ORIGINAL ENVIADO:
Asunto original: ${context.originalSubject}`;
  }

  if (context.originalRecipient) {
    prompt += `
Enviado a: ${context.originalRecipient}`;
  }

  prompt += `

---
Clasifica esta respuesta según las categorías definidas.`;

  return prompt;
}

/**
 * Response from the classifier
 */
export interface ClassificationResult {
  classification:
    | 'negativa'
    | 'automatica'
    | 'entrevista'
    | 'mas_informacion'
    | 'contratado'
    | 'sin_clasificar';
  confidence: number;
  reasoning: string;
}
