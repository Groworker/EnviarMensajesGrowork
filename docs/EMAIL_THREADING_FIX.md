# 🔧 Corrección del Sistema de Respuestas en Hilo (Email Threading)

## 📋 Resumen Ejecutivo

Se ha implementado una solución completa para garantizar que las respuestas de correo electrónico se mantengan en el mismo hilo de conversación en Gmail. El problema se debía a que el header `References` no incluía todos los Message-IDs de la conversación, lo que causaba que Gmail tratara las respuestas como mensajes nuevos.

---

## ✅ Cambios Implementados

### 1. **Base de Datos** - Nueva Migración
**Archivo:** `backend/src/migrations/1738960000000-AddEmailThreadingFields.ts`

Se agregaron dos campos nuevos a la tabla `email_responses`:
- `in_reply_to` (VARCHAR 500): Almacena el header In-Reply-To del mensaje recibido
- `references_header` (TEXT): Almacena la cadena completa del header References

```sql
ALTER TABLE email_responses
ADD COLUMN in_reply_to VARCHAR(500),
ADD COLUMN references_header TEXT;
```

### 2. **Entidad EmailResponse** - Nuevos Campos
**Archivo:** `backend/src/entities/email-response.entity.ts`

```typescript
@Column({ name: 'in_reply_to', nullable: true, length: 500 })
inReplyTo: string;

@Column({ name: 'references_header', type: 'text', nullable: true })
referencesHeader: string;
```

### 3. **Servicio de Lectura de Gmail** - Captura de Headers
**Archivo:** `backend/src/email/gmail-reader.service.ts`

**Cambios:**
- La interfaz `GmailMessage` ahora incluye `inReplyTo` y `references`
- El método `parseMessage` extrae los headers `In-Reply-To` y `References` de los mensajes recibidos

```typescript
export interface GmailMessage {
  // ... campos existentes
  inReplyTo: string | null;
  references: string | null;
}
```

### 4. **Servicio de Sincronización** - Guardar Headers
**Archivo:** `backend/src/email/response-sync.service.ts`

Ahora guarda los headers de threading al crear respuestas:

```typescript
const response = this.emailResponseRepository.create({
  // ... campos existentes
  inReplyTo: message.inReplyTo,
  referencesHeader: message.references,
  // ...
});
```

### 5. **Servicio de Email** - Construcción Correcta de Headers
**Archivo:** `backend/src/email/email.service.ts`

**Métodos nuevos:**

#### `normalizeMessageId(messageId: string): string`
Asegura que los Message-IDs tengan el formato correcto con corchetes angulares `<id@domain.com>`, evitando duplicaciones.

#### `buildReferencesHeader(existingReferences: string | null, inReplyToMessageId: string): string`
Construye la cadena completa de referencias incluyendo:
1. Todas las referencias existentes del mensaje recibido
2. El Message-ID del mensaje al que se está respondiendo

**Actualización del método `sendReplyInThread`:**
```typescript
async sendReplyInThread(
  // ... parámetros existentes
  existingReferences?: string | null,  // NUEVO PARÁMETRO
): Promise<EmailSendResult>
```

Ahora usa los headers correctos:
```typescript
headers: {
  'In-Reply-To': normalizedInReplyTo,        // Normalizado
  References: referencesChain,               // Cadena completa
}
```

### 6. **Servicio de Respuestas** - Uso de Headers Completos
**Archivo:** `backend/src/email/email-responses.service.ts`

El método `sendReply` ahora pasa la cadena completa de referencias:

```typescript
const result = await this.emailService.sendReplyInThread(
  response.fromEmail,
  subject,
  htmlContent,
  client.emailOperativo,
  response.gmailThreadId,
  response.gmailMessageId,
  response.referencesHeader,  // 🔥 Cadena completa de referencias
);
```

---

## 🔍 Cómo Funciona Ahora

### Flujo Completo:

1. **Cliente envía email inicial** → Se almacena el `threadId` y `messageId`
2. **Destinatario responde** → Sistema sincroniza y captura:
   - `gmailMessageId` del mensaje
   - `inReplyTo` header (a qué mensaje responde)
   - `references` header (toda la cadena de la conversación)
3. **Cliente responde desde el sistema** → Se construyen headers correctos:
   - `In-Reply-To`: Message-ID del último mensaje
   - `References`: **TODOS** los Message-IDs de la conversación
   - `threadId`: Se mantiene el mismo thread
4. **Gmail agrupa correctamente** ✅

### Ejemplo de Headers Generados:

**Mensaje 1 (Original):**
```
Message-ID: <abc123@gmail.com>
```

**Mensaje 2 (Respuesta del destinatario):**
```
Message-ID: <def456@gmail.com>
In-Reply-To: <abc123@gmail.com>
References: <abc123@gmail.com>
```

**Mensaje 3 (Nuestra respuesta - ANTES del fix):**
```
Message-ID: <ghi789@gmail.com>
In-Reply-To: <def456@gmail.com>
References: <def456@gmail.com>  ❌ INCOMPLETO - falta abc123
```

**Mensaje 3 (Nuestra respuesta - DESPUÉS del fix):**
```
Message-ID: <ghi789@gmail.com>
In-Reply-To: <def456@gmail.com>
References: <abc123@gmail.com> <def456@gmail.com>  ✅ COMPLETO
```

---

## 🚀 Instrucciones de Despliegue

### 1. Ejecutar la Migración

```bash
cd backend
npm run migration:run
```

Esto agregará los campos `in_reply_to` y `references_header` a la tabla `email_responses`.

### 2. Reiniciar el Backend

```bash
npm run start:dev
# o
npm run start:prod
```

### 3. Sincronizar Respuestas Existentes (Opcional)

Para actualizar respuestas ya recibidas con los nuevos headers:

```bash
# Ejecutar sincronización manual
curl -X POST http://localhost:3000/email-responses/sync-all
```

---

## 🧪 Cómo Probar

### Test Manual:

1. **Enviar un email de prueba** desde el sistema a tu propia cuenta
2. **Responder ese email** desde tu cliente de correo (Gmail, Outlook, etc.)
3. **Esperar la sincronización** (automática cada 30 minutos) o forzarla:
   ```bash
   curl -X POST http://localhost:3000/email-responses/sync-all
   ```
4. **Verificar que se guardaron los headers:**
   ```bash
   curl http://localhost:3000/email-responses | jq '.[] | {id, inReplyTo, referencesHeader}'
   ```
5. **Responder desde el sistema** usando el endpoint:
   ```bash
   curl -X POST http://localhost:3000/email-responses/{id}/send-reply \
     -H "Content-Type: application/json" \
     -d '{"subject": "Re: Test", "htmlContent": "<p>My reply</p>"}'
   ```
6. **Verificar en Gmail** que todos los mensajes aparecen agrupados en el mismo hilo

### Verificación de Headers:

Revisa los logs del backend después de enviar una respuesta. Deberías ver:

```
[EmailResponsesService] Threading info - ThreadID: xxx, InReplyTo: <...>, MessageID: <...>, References: Present
[EmailService] Threading headers - In-Reply-To: <...>, References: <...> <...>
```

---

## 📊 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `backend/src/migrations/1738960000000-AddEmailThreadingFields.ts` | ✨ Nuevo - Migración de BD |
| `backend/src/entities/email-response.entity.ts` | ➕ Agregados campos `inReplyTo` y `referencesHeader` |
| `backend/src/email/gmail-reader.service.ts` | ➕ Extracción de headers In-Reply-To y References |
| `backend/src/email/response-sync.service.ts` | ➕ Guardar headers al sincronizar |
| `backend/src/email/email.service.ts` | ➕ Métodos helper + actualización de `sendReplyInThread` |
| `backend/src/email/email-responses.service.ts` | ➕ Pasar headers completos al enviar respuesta |

---

## 🎯 Resultado Esperado

✅ **ANTES:** Cada respuesta creaba un nuevo hilo en Gmail
✅ **AHORA:** Todas las respuestas se mantienen en el mismo hilo de conversación

---

## 📚 Referencias Técnicas

- **RFC 5322 - Internet Message Format:** Define el formato correcto de los headers `In-Reply-To` y `References`
- **Gmail API Documentation:** Especificaciones sobre threading en Gmail
- **Nodemailer Headers:** Implementación de headers personalizados en emails

---

## 🐛 Troubleshooting

### Problema: Las respuestas aún no se agrupan

**Solución:**
1. Verificar que la migración se ejecutó correctamente
2. Comprobar los logs del backend para ver si se están capturando los headers
3. Verificar que las respuestas sincronizadas tengan `referencesHeader` poblado
4. Revisar que el `gmailThreadId` sea el mismo en todos los mensajes del hilo

### Problema: Error al ejecutar la migración

**Solución:**
1. Verificar que la base de datos esté corriendo
2. Comprobar las variables de entorno en `backend/.env`
3. Verificar permisos de usuario de base de datos

---

## ✨ Próximos Pasos (Opcional)

1. **Script de migración retroactiva:** Actualizar respuestas antiguas con headers desde Gmail API
2. **Monitoreo:** Agregar métricas para rastrear tasa de éxito de threading
3. **Tests automatizados:** Crear tests E2E para validar el threading

---

**Fecha de implementación:** 2026-02-06
**Versión:** 1.0.0
**Estado:** ✅ Completado
