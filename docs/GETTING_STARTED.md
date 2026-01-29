# Guía de Inicio del Proyecto

Sistema automatizado de envío de CVs/emails para agencias de reclutamiento.

## Requisitos Previos

- **Node.js** v18 o superior
- **PostgreSQL** v14 o superior
- **npm** v9 o superior
- Cuenta de **Google Workspace** con Domain-Wide Delegation configurado
- Cuenta de **Zoho CRM** con credenciales API

---

## 1. Clonar e Instalar Dependencias

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd "13. Envio de correos"

# Instalar dependencias (raíz, backend y frontend)
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

---

## 2. Configurar Base de Datos

### Crear base de datos PostgreSQL

```sql
CREATE DATABASE cv_sender_db;
```

### Ejecutar migraciones

```bash
cd backend
npm run migration:run
```

---

## 3. Configurar Variables de Entorno

Crea el archivo `backend/.env` basándote en `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

### Variables requeridas:

```env
# Base de datos
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=tu_contraseña
DATABASE_NAME=cv_sender_db
DATABASE_SSL=false

# Zoho CRM (obtener en https://api-console.zoho.com/)
ZOHO_CLIENT_ID=tu_client_id
ZOHO_CLIENT_SECRET=tu_client_secret
ZOHO_REFRESH_TOKEN=tu_refresh_token
ZOHO_API_DOMAIN=https://www.zohoapis.eu
```

---

## 4. Configurar Google Credentials

1. Crea una cuenta de servicio en Google Cloud Console
2. Habilita Domain-Wide Delegation
3. Descarga el archivo JSON de credenciales
4. Guárdalo como `backend/google-creds.json`

---

## 5. Iniciar el Proyecto

### Opción A: Ambos servicios a la vez (recomendado para desarrollo)

```bash
npm run dev
```

Esto inicia:
- Backend en `http://localhost:3000`
- Frontend en `http://localhost:3001`

### Opción B: Servicios por separado

**Terminal 1 - Backend:**
```bash
npm run dev:backend
# o
cd backend && npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
# o
cd frontend && npm run dev
```

### Opción C: Solo backend (para testing de APIs)

```bash
cd backend
npm run start:dev
```

---

## 6. Verificar que Funciona

1. **Health check:**
   ```bash
   curl http://localhost:3000
   # Respuesta: "Hello World!"
   ```

2. **Ver estadísticas del dashboard:**
   ```bash
   curl http://localhost:3000/api/dashboard/stats
   ```

3. **Abrir frontend:**
   - Navega a `http://localhost:3001`

---

## 7. Sincronización Inicial con Zoho

Para cargar todos los clientes desde Zoho CRM:

```bash
curl -X POST http://localhost:3000/api/zoho-sync/full
```

---

## Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia backend + frontend |
| `npm run dev:backend` | Solo backend (puerto 3000) |
| `npm run dev:frontend` | Solo frontend (puerto 3001) |
| `cd backend && npm run build` | Compilar backend para producción |
| `cd backend && npm run test` | Ejecutar tests unitarios |
| `cd backend && npm run lint` | Verificar código con ESLint |

---

## Estructura del Proyecto

```
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── api/            # Endpoints REST
│   │   ├── entities/       # Modelos de base de datos
│   │   ├── scheduler/      # Cron job diario (6 AM)
│   │   ├── worker/         # Procesador de emails
│   │   ├── email/          # Integración Gmail API
│   │   └── zoho/           # Integración Zoho CRM
│   ├── google-creds.json   # Credenciales Google (no en repo)
│   └── .env                # Variables de entorno (no en repo)
│
├── frontend/               # Dashboard Next.js
│   └── app/               # Páginas (App Router)
│
└── package.json           # Scripts raíz para dev
```

---

## Solución de Problemas

### Error de conexión a PostgreSQL
- Verifica que PostgreSQL está corriendo
- Confirma las credenciales en `.env`

### Error de autenticación Zoho
- Regenera el refresh token si expiró
- Verifica que `ZOHO_API_DOMAIN` coincide con tu región

### Error de Gmail API
- Verifica que `google-creds.json` existe
- Confirma que Domain-Wide Delegation está habilitado

---

## Siguiente Paso

Consulta [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) para ver todos los endpoints disponibles.
