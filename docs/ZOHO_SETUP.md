# Configuración de Integración con Zoho CRM

Esta guía explica cómo configurar la integración con Zoho CRM para sincronizar los estados de los clientes.

## 🎯 Funcionalidad

La integración permite:
- ✅ Cambiar el estado de un cliente desde la aplicación web
- ✅ Actualizar automáticamente el estado en la base de datos
- ✅ Sincronizar el estado con Zoho CRM en tiempo real
- ✅ Notificaciones de éxito/error con detalles completos

## 📋 Estados Disponibles

Los siguientes estados están disponibles en el sistema:

| Estado | Descripción | Icono |
|--------|-------------|-------|
| **Envío activo** | El cliente está recibiendo envíos automáticos de emails | ✅ |
| **Entrevista** | El cliente ha recibido una respuesta y tiene una entrevista programada | 📞 |
| **Contratado** | El cliente ha sido contratado por alguna empresa | 🎉 |
| **Cerrado** | Se han agotado los emails disponibles, servicio finalizado | 🔒 |
| **Pausado** | Los envíos están pausados temporalmente | ⏸️ |

> **Nota**: Los estados "Pre-venta" y "No cliente" se eliminaron porque no son relevantes para clientes activos.

## 🔧 Configuración

### Paso 1: Obtener Credenciales de Zoho

1. Ve a la **Consola de API de Zoho**: https://api-console.zoho.com/

2. **Crear una nueva aplicación**:
   - Haz clic en "Get Started" o "Add Client"
   - Selecciona el tipo de cliente: **"Self Client"** (para uso interno)
   - Dale un nombre descriptivo a tu aplicación (ej: "CV Sender Integration")

3. **Copiar Client ID y Client Secret**:
   - Una vez creada la aplicación, verás tus credenciales
   - Guarda el **Client ID** y **Client Secret** en un lugar seguro

### Paso 2: Generar Refresh Token

1. **Generar código de autorización**:

   Visita la siguiente URL en tu navegador (reemplaza `{CLIENT_ID}` con tu Client ID):

   ```
   https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id={CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=https://www.zoho.com/crm
   ```

2. **Autorizar la aplicación**:
   - Inicia sesión en tu cuenta de Zoho
   - Acepta los permisos solicitados
   - Serás redirigido a una página con un código en la URL
   - Copia el código de la URL (parámetro `code=...`)

3. **Intercambiar el código por un refresh token**:

   Ejecuta este comando en tu terminal (reemplaza los valores):

   ```bash
   curl -X POST https://accounts.zoho.com/oauth/v2/token \
     -d "code={AUTHORIZATION_CODE}" \
     -d "client_id={CLIENT_ID}" \
     -d "client_secret={CLIENT_SECRET}" \
     -d "redirect_uri=https://www.zoho.com/crm" \
     -d "grant_type=authorization_code"
   ```

4. **Guardar el refresh token**:
   - La respuesta incluirá un `refresh_token`
   - Este token **no expira** y se usa para obtener access tokens automáticamente
   - Guárdalo de forma segura

### Paso 3: Configurar Variables de Entorno

Edita tu archivo `.env` en el backend y agrega:

```env
# Zoho CRM Integration
ZOHO_CLIENT_ID=1000.XXXXXXXXXXXXXXXXXXXXXXXX
ZOHO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ZOHO_REFRESH_TOKEN=1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ZOHO_API_DOMAIN=https://www.zohoapis.com
```

**Notas**:
- `ZOHO_API_DOMAIN` depende de tu región:
  - 🇺🇸 Estados Unidos: `https://www.zohoapis.com`
  - 🇪🇺 Europa: `https://www.zohoapis.eu`
  - 🇦🇺 Australia: `https://www.zohoapis.com.au`
  - 🇮🇳 India: `https://www.zohoapis.in`
  - 🇨🇳 China: `https://www.zohoapis.com.cn`

### Paso 4: Verificar Campo en Zoho CRM

Asegúrate de que existe un campo llamado **"Estado del cliente"** en el módulo de Contactos de Zoho CRM:

1. Ve a Zoho CRM → Settings → Modules and Fields
2. Selecciona el módulo **"Contacts"**
3. Verifica que existe un campo llamado **"Estado del cliente"**
   - **Nombre visible**: Estado del cliente
   - **Nombre API**: `Estado_del_cliente`
4. Si no existe, créalo como campo de tipo **"Pick List"** con las siguientes opciones:
   - Envío activo
   - Entrevista
   - Contratado
   - Cerrado
   - Pausado

> ⚠️ **Importante**: El nombre del campo ya existe en tu Zoho CRM como "Estado del cliente" (API: `Estado_del_cliente`). El código ya está configurado para usar este nombre.

### Paso 5: Reiniciar el Backend

```bash
cd backend
npm run start:dev
```

## 🚀 Uso

### Desde la Aplicación Web

1. Ve a la página de **Clientes** (`/clients`)
2. En la tabla, localiza la columna **"Estado CRM"**
3. Haz clic en el selector desplegable del cliente
4. Selecciona el nuevo estado
5. El sistema:
   - ✅ Actualizará la base de datos
   - ✅ Sincronizará con Zoho CRM
   - ✅ Mostrará una notificación de éxito o error

### Notificaciones

- **Éxito**: Toast verde con mensaje "Estado actualizado correctamente y sincronizado con Zoho CRM"
- **Error**: Toast rojo con detalles del error y botón para copiar el mensaje completo

## 🔍 Troubleshooting

### Error: "Failed to authenticate with Zoho CRM"

**Causas posibles**:
- Refresh token inválido o expirado
- Client ID o Client Secret incorrectos
- Permisos insuficientes en la aplicación Zoho

**Solución**:
1. Verifica que las credenciales en `.env` sean correctas
2. Regenera el refresh token siguiendo el Paso 2
3. Asegúrate de que el scope incluye `ZohoCRM.modules.ALL`

### Error: "Failed to update estado in Zoho CRM"

**Causas posibles**:
- El campo "Estado del cliente" no existe en Zoho CRM
- El nombre API del campo es diferente a `Estado_del_cliente`
- El Zoho ID del cliente es inválido
- El valor del estado no coincide con las opciones del Pick List

**Solución**:
1. Verifica que el campo "Estado del cliente" existe en Zoho CRM (Paso 4)
2. Confirma que el nombre API es exactamente `Estado_del_cliente`
3. Comprueba que el `zohoId` del cliente es correcto
4. Verifica que los valores del estado (Envío activo, Entrevista, etc.) existen en el Pick List de Zoho
5. Revisa los logs del backend para más detalles

### La base de datos se actualiza pero Zoho no

El sistema está diseñado para **no hacer rollback** si Zoho falla:
- ✅ La base de datos se actualiza primero
- ⚠️ Si Zoho falla, se registra un warning en los logs
- 🔧 Puedes sincronizar manualmente desde Zoho CRM

Esto previene pérdida de datos en caso de problemas temporales con la API de Zoho.

## 📊 Logs

Los logs del sistema incluyen:
- Actualizaciones de estado exitosas
- Errores de sincronización con Zoho
- Refreshes de access token
- Warnings sobre sincronización fallida

Revisa los logs con:
```bash
# En desarrollo
npm run start:dev

# En producción
pm2 logs
```

## 🔐 Seguridad

- ✅ El refresh token **NUNCA** expira (guárdalo de forma segura)
- ✅ Los access tokens se regeneran automáticamente cada hora
- ✅ Las credenciales se almacenan en variables de entorno
- ✅ No se exponen credenciales en el frontend
- ⚠️ Mantén tu archivo `.env` fuera del control de versiones

## 📚 Referencias

- [Zoho CRM API Documentation](https://www.zoho.com/crm/developer/docs/api/v2/)
- [OAuth 2.0 for Zoho CRM](https://www.zoho.com/crm/developer/docs/api/v2/oauth-overview.html)
- [Zoho API Console](https://api-console.zoho.com/)
