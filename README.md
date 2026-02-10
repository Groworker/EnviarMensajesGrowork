# Growork - Sistema Automatizado de Envio de CVs y Gestion de Clientes

Sistema completo que automatiza el envio de CVs por email a ofertas de trabajo, gestion de workflows con n8n, creacion de emails corporativos via Google Workspace, y panel de administracion web. Disenado para agencias de reclutamiento que gestionan multiples candidatos.

---

## Arquitectura General

```
                    ZOHO CRM (Clientes)
                         |
            +-----------+-----------+
            |                       |
      n8n Workflows            Zoho Sync
      (WKF-1 a WKF-4)       (cada minuto)
            |                       |
            v                       v
    +------------------+   +------------------+
    | Backend (NestJS) |<->|   PostgreSQL DB   |
    |   Puerto 4000    |   |  13 tablas/entid. |
    +------------------+   +------------------+
            ^
            |  Nginx (puerto 3000)
            v
    +------------------+
    | Frontend (Next)  |
    |   Puerto 4001    |
    +------------------+
```

**Produccion:** Docker container unico con Nginx + Supervisor gestionando 3 procesos.
**Desarrollo:** `npm run dev` (backend 3000, frontend 3001).

---

## Estructura de Directorios

```
proyecto/
|
|-- backend/                     # API NestJS (servidor principal)
|   |-- src/                     # Codigo fuente TypeScript
|   |   |-- main.ts              # Bootstrap: CORS, ValidationPipe, prefix /api
|   |   |-- app.module.ts        # Modulo raiz (importa 13 modulos)
|   |   |-- app.controller.ts    # Health check (GET /api)
|   |   |
|   |   |-- config/              # Configuracion del sistema
|   |   |   |-- configuration.ts # Variables de entorno tipadas
|   |   |   |-- data-source.ts   # DataSource TypeORM (CLI migraciones)
|   |   |   +-- env.validation.ts# Validacion Joi de .env
|   |   |
|   |   |-- common/              # Utilidades compartidas
|   |   |   |-- filters/http-exception.filter.ts    # Manejo global errores
|   |   |   |-- interceptors/logging.interceptor.ts # Log de peticiones
|   |   |   +-- utils/google-auth.util.ts           # Auth Google (JWT)
|   |   |
|   |   |-- entities/            # 11 entidades TypeORM (tablas DB)
|   |   |   |-- client.entity.ts
|   |   |   |-- client-send-settings.entity.ts
|   |   |   |-- client-workflow-state.entity.ts
|   |   |   |-- cv-creator.entity.ts
|   |   |   |-- dominio.entity.ts
|   |   |   |-- email-send.entity.ts
|   |   |   |-- email-response.entity.ts
|   |   |   |-- email-reputation.entity.ts
|   |   |   |-- global-send-config.entity.ts
|   |   |   |-- job-offer.entity.ts
|   |   |   +-- send-job.entity.ts
|   |   |
|   |   |-- clients/             # Modulo de gestion de clientes
|   |   |-- email/               # Modulo de email (envio, preview, respuestas)
|   |   |-- ai/                  # Modulo IA (OpenAI para generar emails)
|   |   |-- scheduler/           # Cron jobs (crea SendJobs diarios)
|   |   |-- worker/              # Procesador de cola de emails
|   |   |-- dashboard/           # KPIs y estadisticas
|   |   |-- notifications/       # Notificaciones del sistema
|   |   |-- workflow-state/      # Estado Kanban de workflows
|   |   |-- cv-creators/         # Gestion de creadores de CV
|   |   |-- dominios/            # Gestion de dominios de email
|   |   |-- n8n/                 # Webhooks n8n (recibe callbacks)
|   |   |-- zoho/                # Sincronizacion con Zoho CRM
|   |   |-- drive/               # Google Drive (adjuntos de CV)
|   |   |-- migrations/          # Migraciones TypeORM (10 archivos .ts)
|   |   +-- types/               # Tipos TypeScript compartidos
|   |
|   |-- scripts/                 # Scripts de utilidad (NO produccion)
|   |   |-- migrations/          # Runners SQL + archivos .sql
|   |   |-- db-checks/           # Verificacion de base de datos
|   |   |-- testing/             # Scripts de prueba
|   |   |-- gmail/               # Verificacion de Gmail
|   |   +-- fixes/               # Correcciones puntuales
|   |
|   |-- _archive/                # Archivos obsoletos (no se compilan)
|   |-- test/                    # Tests E2E
|   |-- .env                     # Variables de entorno (NO en git)
|   |-- .env.example             # Plantilla de variables
|   |-- google-creds.json        # Credenciales Google (NO en git)
|   |-- Dockerfile               # Build del backend
|   |-- package.json             # Dependencias y scripts NestJS
|   |-- tsconfig.json            # Configuracion TypeScript
|   +-- tsconfig.build.json      # Excluye _archive y scripts del build
|
|-- frontend/                    # Panel web Next.js
|   |-- app/                     # Paginas (App Router)
|   |   |-- layout.tsx           # Layout raiz (Navbar + Toaster)
|   |   |-- page.tsx             # Redirect / -> /dashboard
|   |   |-- globals.css          # Estilos globales Tailwind
|   |   |-- dashboard/page.tsx   # KPIs, graficos, pipeline
|   |   |-- clients/page.tsx     # Gestion de clientes + stats email
|   |   |-- notifications/page.tsx # Kanban de workflows (Pipedrive-style)
|   |   |-- cv-creators/page.tsx # CRUD creadores de CV
|   |   |-- dominios/page.tsx    # CRUD dominios de email
|   |   |-- preview-emails/page.tsx # Revision y aprobacion de emails
|   |   |-- responses/page.tsx   # Respuestas recibidas + clasificacion IA
|   |   +-- api/                 # API routes (proxy al backend)
|   |       |-- [...path]/route.ts         # Proxy catch-all
|   |       |-- dashboard/kpis/route.ts    # KPIs
|   |       |-- dashboard/email-stats/route.ts
|   |       |-- dashboard/pipeline/route.ts
|   |       +-- notifications/             # Notificaciones
|   |
|   |-- components/              # Componentes React
|   |   |-- Navbar.tsx           # Navegacion principal (7 links)
|   |   |-- ConfirmDialog.tsx    # Modal de confirmacion (Radix UI)
|   |   |-- GlobalConfigModal.tsx# Config global de envio
|   |   |-- ClassificationBadge.tsx # Badge clasificacion email
|   |   |-- MultiSelectInput.tsx # Input multi-seleccion con tags
|   |   |-- DeleteClientModal.tsx# Modal borrado con verificacion
|   |   |-- ReplyModal.tsx       # Editor de respuesta (TipTap)
|   |   |-- dashboard/          # Componentes del dashboard
|   |   |   |-- KPICards.tsx     # 5 tarjetas KPI
|   |   |   |-- EmailStatsChart.tsx  # Grafico barras (Recharts)
|   |   |   |-- ClientPipeline.tsx   # Grafico circular
|   |   |   +-- WorkflowNotifications.tsx # Notificaciones expandibles
|   |   |-- notifications/      # Componentes Kanban
|   |   |   |-- WorkflowColumn.tsx     # Columna de workflow
|   |   |   |-- ClientCard.tsx         # Tarjeta de cliente
|   |   |   +-- ClientWorkflowModal.tsx # Modal detalle workflow
|   |   |-- cv-creators/
|   |   |   +-- CvCreatorModal.tsx # Modal crear/editar creador
|   |   |-- dominios/
|   |   |   +-- DominioModal.tsx # Modal crear/editar dominio
|   |   +-- ui/                  # Primitivos UI (Radix)
|   |       |-- card.tsx
|   |       |-- badge.tsx
|   |       +-- select.tsx
|   |
|   |-- lib/                     # Utilidades
|   |   |-- api.ts               # Instancia Axios
|   |   +-- api-config.ts        # Resolucion URL backend
|   |
|   |-- public/                  # Assets estaticos
|   |   |-- growork-logo-black.png  # Logo (usado en Navbar)
|   |   +-- growork-logo.png        # Logo alternativo
|   |
|   |-- _archive/                # SVGs por defecto de Next.js (no usados)
|   |-- .env.local               # Dev: NEXT_PUBLIC_API_URL=http://localhost:3000
|   |-- .env.production          # Prod: vacio (usa proxy nginx)
|   +-- next.config.ts           # output: 'standalone'
|
|-- scripts/                     # Scripts de utilidad (raiz)
|   |-- config.js                # Config compartida (lee backend/.env)
|   |-- db/
|   |   |-- insert-test-offer.js # Inserta oferta de prueba
|   |   |-- run-warmup-migration.js # Migra feature warmup
|   |   +-- update-target-limits.js # Actualiza limites masivamente
|   +-- testing/
|       +-- test-matching.js     # Prueba logica de matching
|
|-- deploy/                      # Configuracion de despliegue
|   |-- nginx.conf               # Proxy: /api -> :4000, /* -> :4001
|   +-- supervisord.conf         # Gestiona nginx + backend + frontend
|
|-- docs/                        # Documentacion
|   |-- API_DOCUMENTATION.md     # Referencia completa de endpoints
|   |-- ATTACHMENT_CACHE.md      # Sistema de cache de adjuntos
|   |-- CLAUDE.md                # Contexto para IA (arquitectura)
|   |-- EMAIL_THREADING_FIX.md   # Fix threading Gmail
|   |-- GETTING_STARTED.md       # Guia de instalacion
|   |-- MEJORAS_IMPLEMENTADAS.md # Mejoras tecnicas realizadas
|   |-- README_THREADING_FIX.md  # Verificacion threading
|   |-- UI_IMPROVEMENTS_RESPONSES.md # Mejoras UI respuestas
|   +-- ZOHO_SETUP.md            # Configuracion Zoho CRM
|
|-- workflows/                   # JSONs de n8n (gitignored en prod)
|   |-- WKF-1: Creador de Carpetas + CV
|   |-- WKF-1.1: Avisar al creador
|   |-- WKF-1.2: Nuevo Archivo en carpeta NEW
|   |-- WKF-1.3: Mover CV a Definitiva
|   |-- WKF-4: Generacion Automatica de mail corporativo
|   +-- WKF-4.1: Actualizar PostgreSQL al editar Zoho
|
|-- Dockerfile                   # Build multi-stage (3 stages)
|-- package.json                 # Scripts raiz (dev, utilidades)
|-- .gitignore                   # Excluye .env, creds, node_modules
+-- .dockerignore                # Excluye scripts, docs del Docker
```

---

## Base de Datos - Entidades (13 tablas)

### `clients` - Clientes principales
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | SERIAL PK | ID auto-incremental |
| zohoId | VARCHAR UNIQUE | ID en Zoho CRM (indexado) |
| nombre, apellido | VARCHAR | Datos personales |
| email | VARCHAR | Email personal del cliente (indexado) |
| emailOperativo | VARCHAR | Email corporativo creado (ej: nombre.apellido@personalwork.es) |
| emailOperativoPw | VARCHAR | Password del email corporativo |
| industria, jobTitle | VARCHAR | Sector e industria objetivo |
| paisesInteres | JSONB | Array de paises objetivo |
| ciudadesInteres | JSONB | Array de ciudades objetivo |
| estado | VARCHAR | Estado del cliente (Envio Activo, Pausado, Cerrado...) |
| idCarpetaCliente | VARCHAR | ID carpeta Google Drive del cliente |
| idCarpetaCv, idCarpetaOld, idCarpetaNew, idCarpetaDefinitiva | VARCHAR | IDs subcarpetas Drive |
| deletedAt, deletionReason | TIMESTAMP/VARCHAR | Soft delete |

### `client_send_settings` - Config de envio por cliente
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| clientId | FK -> clients | Relacion 1:1 |
| active | BOOLEAN | Si esta habilitado el envio |
| minDailyEmails, maxDailyEmails | INT | Rango diario (default 2-5) |
| currentDailyLimit | INT | Limite actual (warmup) |
| targetDailyLimit | INT | Limite objetivo (default 25) |
| warmupDailyIncrement | INT | Incremento diario |
| isWarmupActive | BOOLEAN | Si warmup esta activo |
| previewEnabled | BOOLEAN | Si requiere revision manual |
| matchingCriteria | JSONB | Criterios de busqueda de ofertas |

### `client_workflow_states` - Estado de workflows por cliente
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| clientId + workflowType | UNIQUE | Combinacion unica |
| workflowType | ENUM | WKF_1, WKF_1_1, WKF_1_2, WKF_1_3, WKF_4 |
| status | ENUM | PENDING (naranja), OK (verde), ERROR (rojo) |
| executionUrl | VARCHAR | URL de ejecucion en n8n |
| errorMessage | VARCHAR | Mensaje de error si fallo |
| metadata | JSONB | Datos adicionales del workflow |

### `dominios` - Dominios de email
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| dominio | VARCHAR UNIQUE | Ej: personalwork.es |
| activo | BOOLEAN | Si esta disponible |
| prioridad | INT | Peso para seleccion aleatoria ponderada |
| usuariosActuales | INT | Calculado automaticamente (COUNT emails con @dominio) |
| maxUsuarios | INT | Maximo de usuarios permitidos (default 3) |

### `cv_creators` - Creadores de CV
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| nombre, email | VARCHAR | Datos del creador |
| activo | BOOLEAN | Si esta disponible |
| ingles, aleman, frances, italiano | BOOLEAN | Idiomas que domina |

### `email_sends` - Emails enviados
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| clientId | FK -> clients | Cliente que envia |
| jobOfferId | FK -> job_offers | Oferta destino |
| status | ENUM | RESERVED, PENDING_REVIEW, APPROVED, SENT, FAILED, BOUNCED, REJECTED |
| content_snapshot, subjectSnapshot | TEXT | Contenido del email |
| messageId, gmailThreadId | VARCHAR | IDs de Gmail para threading |
| has_responses, response_count | BOOLEAN/INT | Tracking de respuestas |

### `email_responses` - Respuestas recibidas
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| emailSendId | FK -> email_sends | Email original |
| classification | ENUM | NEGATIVA, AUTOMATICA, ENTREVISTA, MAS_INFORMACION, CONTRATADO, SIN_CLASIFICAR |
| classificationConfidence | FLOAT | Confianza de la IA (0-1) |
| fromEmail, fromName | VARCHAR | Remitente |
| subject, bodyText, bodyHtml | TEXT | Contenido de la respuesta |
| gmailMessageId, gmailThreadId | VARCHAR | IDs Gmail |

### Otras tablas:
- **`job_offers`**: Ofertas de trabajo (hotel, puesto, ciudad, email, pais, fuente)
- **`send_jobs`**: Trabajos de envio batch (QUEUED, RUNNING, DONE, FAILED)
- **`email_reputation`**: Reputacion de emails (bounces, invalidos)
- **`global_send_config`**: Config global (horas envio 9-18, delays 2-5 min)
- **`notifications`**: Notificaciones del sistema (workflow events, deletions, emails)

---

## Modulos Backend - Endpoints API

### Clients (`/api/clients`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/clients` | Listar todos con settings |
| GET | `/clients/:id` | Obtener uno |
| GET | `/clients/:id/email-stats` | Stats de email (sent, failed, bounced, success rate) |
| POST | `/clients` | Crear (auto-inicializa workflow states) |
| PUT | `/clients/:id` | Actualizar |
| PATCH | `/clients/:id/settings` | Actualizar send settings |
| PATCH | `/clients/:id/estado` | Cambiar estado (sincroniza a Zoho) |
| POST | `/clients/bulk/activate` | Activar todos |
| POST | `/clients/bulk/deactivate` | Pausar todos |

### Email Preview (`/api/email-preview`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/email-preview` | Emails pendientes de revision |
| GET | `/email-preview/stats` | Estadisticas pendientes |
| GET | `/email-preview/approved-today` | Aprobados hoy |
| POST | `/email-preview/:id/approve` | Aprobar y enviar |
| POST | `/email-preview/:id/reject` | Rechazar |
| POST | `/email-preview/:id/regenerate` | Regenerar con IA |
| PATCH | `/email-preview/:id` | Editar subject/contenido |

### Email Responses (`/api/email-responses`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/email-responses` | Listar (filtro: clientId, classification, isRead) |
| GET | `/email-responses/stats` | Stats por clasificacion |
| GET | `/email-responses/:id/thread` | Hilo completo de conversacion |
| POST | `/email-responses/sync` | Sincronizar desde Gmail |
| POST | `/email-responses/:id/reclassify` | Reclasificar con IA |
| POST | `/email-responses/:id/suggest-reply` | Sugerencia IA de respuesta |
| POST | `/email-responses/:id/send-reply` | Enviar respuesta en el hilo |
| PATCH | `/email-responses/:id/classification` | Clasificacion manual |

### Global Config (`/api/global-config`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/global-config` | Obtener config (crea default si no existe) |
| PUT | `/global-config` | Actualizar horas, delays |

### Dashboard (`/api/dashboard`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/dashboard/kpis` | Clientes activos, emails enviados, success rate, notificaciones |
| GET | `/dashboard/email-stats` | Stats ultimos 30 dias por dia |
| GET | `/dashboard/pipeline` | Distribucion clientes por estado |
| GET | `/dashboard/recent-activity` | Actividad reciente |

### Workflow States (`/api/workflow-states`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/workflow-states/pipeline` | Kanban completo (5 columnas) |
| POST | `/workflow-states/:clientId/:workflowType/execute` | Ejecutar workflow en n8n |
| POST | `/workflow-states/:clientId/:workflowType/reset` | Reset a PENDING |

### N8N Webhook (`/api/n8n`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/n8n/webhook` | Recibe callbacks de n8n (success/error) |

**IDs de workflows registrados:**
| Workflow | IDs n8n |
|----------|---------|
| WKF-1 | BuL088npiVZ6gak7, AMtg259bLLwhgbUL |
| WKF-1.1 | Ze3INzogY594XOCg, xCcVhFUwAmDJ4JOT |
| WKF-1.2 | Ajfl4VnlJbPlA03E, beNsoQ2JZOdtusf2 |
| WKF-1.3 | EoSIHDe8HPHQrUWT |
| WKF-4 | 49XoEhgqjyRt3LSg, ItDz2wWOVJbusbXV |

### Zoho Sync (`/api/zoho-sync`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/zoho-sync/status` | Estado de sincronizacion |
| POST | `/zoho-sync/delta` | Sync incremental (solo cambios) |
| POST | `/zoho-sync/full` | Sync completo (todos los contactos) |

### CV Creators (`/api/cv-creators`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/cv-creators` | Listar (filtro por idioma) |
| POST/PUT/DELETE | `/cv-creators/:id` | CRUD completo |

### Dominios (`/api/dominios`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/dominios` | Listar (ordenados por prioridad) |
| POST/PUT/DELETE | `/dominios/:id` | CRUD completo |

### Notifications (`/api/notifications`)
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/notifications` | Listar (limit, offset, archived) |
| GET | `/notifications/unread/count` | Contar no leidas |
| PATCH | `/notifications/:id/read` | Marcar como leida |
| PATCH | `/notifications/read-all` | Marcar todas leidas |

---

## Workflows n8n

### WKF-1: Creador de Carpetas + CV
- **Trigger:** Automatico cuando se crea contacto en Zoho CRM
- **Accion:** Crea carpetas en Google Drive (Cliente, CV, OLD, NEW, DEFINITIVA)
- **Webhook:** Notifica al backend con status success/error

### WKF-1.1: Avisar al Creador
- **Trigger:** Manual desde el frontend (boton en Kanban)
- **Accion:** Comparte carpetas con el creador de CV asignado
- **Webhook:** Notifica al backend

### WKF-1.2: Nuevo Archivo en carpeta NEW
- **Trigger:** Automatico (cada 5 horas, revisa nuevos archivos)
- **Accion:** Detecta archivos nuevos en carpeta NEW
- **Lookup:** Busca cliente por folderId (no tiene zohoId directo)
- **Webhook:** Notifica al backend

### WKF-1.3: Mover CV a Definitiva
- **Trigger:** Manual desde el frontend
- **Accion:** Mueve CV aprobado de NEW a DEFINITIVA
- **Webhook:** Notifica al backend

### WKF-1.4: Email Corporativo
- **Trigger:** Automatico cuando se activa el workflow 1.3
- **Flujo completo:**
  1. `GuardarDatos` - Almacena nombre, apellido, idCliente
  2. `Leer - Dominios Activos` - GET /api/dominios (lee dominios del backend)
  3. `Generar Alias + password + seleccionar dominio` - Code node:
     - Normaliza nombre.apellido como alias
     - Genera password aleatoria
     - Seleccion ponderada de dominio (prioridad + maxUsuarios)
  4. `Google Workspace - Crear Usuario` - Crea mailbox
  5. `Update Email Operativo en ZOHO CRM` - Actualiza Zoho
  6. `Get a contact` - Verifica datos actualizados
  7. `Insert rows in a table` - Guarda en PostgreSQL
  8. `If` - Tiene email personal?
     - Si: Envia credenciales por email + webhook success
     - No: Solo webhook success (sin envio de credenciales)
- **Error handling:** Todos los nodos conectados a `Webhook - Error` via "Continue Using Error Output"

---

## Tareas Automaticas (Cron Jobs)

| Tarea | Frecuencia | Modulo | Que hace |
|-------|-----------|--------|----------|
| Crear SendJobs | 6:00 AM diario | Scheduler | Crea trabajos de envio para clientes con estado "Envio Activo" |
| Procesar emails | Cada minuto | Worker | Procesa cola: IA genera contenido, envia via Gmail (batch 5) |
| Sync respuestas | Programado | ResponseSync | Revisa Gmail para nuevas respuestas, clasifica con IA |

**Ventana de envio:** Configurable via global-config (default: 9:00 - 18:00, delay 2-5 min entre emails)

---

## Frontend - Paginas

### Dashboard (`/dashboard`)
- 5 KPI cards (clientes activos, emails enviados, success rate, notificaciones, deletions)
- Panel de notificaciones de workflows (expandible, con metadatos)
- Grafico pipeline de clientes (por estado)
- Grafico de emails enviados (barras, ultimos 30 dias)
- Auto-refresh: KPIs 30s, stats 2min, pipeline 60s

### Clientes (`/clients`)
- Tabla con busqueda, filtros, ordenamiento
- Stats de email por cliente (sent, failed, bounced, pending, success rate)
- Bulk actions: activar/pausar todos
- Modal de borrado con verificacion de elegibilidad

### Notificaciones (`/notifications`)
- **Kanban board Pipedrive-style** con 5 columnas (WKF-1 a WKF-4)
- Cards coloreadas: Naranja=PENDING, Verde=OK, Rojo=ERROR
- Click en card abre modal con detalles, URL n8n, errores
- Botones de accion: abrir carpeta Drive, ejecutar siguiente workflow
- Auto-refresh cada 30s

### Creadores de CV (`/cv-creators`)
- Tabla con nombre, email, idiomas (banderas), estado activo
- Modal crear/editar con validacion (minimo 1 idioma)

### Dominios (`/dominios`)
- Tabla: dominio, estado (toggle click), prioridad, usuarios actuales, max usuarios
- Modal crear/editar con prioridad y max usuarios configurables
- Usuarios actuales calculado automaticamente (COUNT de clients con @dominio)

### Preview Emails (`/preview-emails`)
- Dos tabs: Pendientes de revision / Aprobados hoy
- Preview del email con edicion inline
- Botones: Aprobar (envia), Rechazar, Regenerar con IA
- Stats: pendientes, aprobados hoy, rechazados hoy

### Respuestas (`/responses`)
- Filtro por cliente, clasificacion, estado de lectura
- Clasificaciones IA: negativa, automatica, entrevista, mas_informacion, contratado
- Vista de hilo completo de conversacion
- Reply modal con editor TipTap (rich text) + sugerencias IA
- Sincronizacion manual desde Gmail

---

## Despliegue en Produccion

### Docker (EasyPanel)
El `Dockerfile` multi-stage genera un container con:
1. **Stage 1 (backend-builder):** Compila NestJS a `dist/`
2. **Stage 2 (frontend-builder):** Build Next.js standalone
3. **Stage 3 (production):** Node 20 Alpine + Nginx + Supervisor

**Proceso:**
- Nginx escucha en puerto 3000 (lo que expone EasyPanel)
- `/api/*` -> Backend (puerto 4000)
- `/*` -> Frontend (puerto 4001)
- `/health` -> "OK" (health check)

### Variables de entorno requeridas en produccion
Configurar en EasyPanel (no en .env):
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_API_DOMAIN`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `GOOGLE_CREDENTIALS_JSON` (JSON completo como string)

---

## Scripts de Utilidad

### Desde la raiz del proyecto
```bash
npm run dev                      # Inicia backend + frontend
npm run script:insert-test-offer # Inserta oferta de prueba
npm run script:warmup-migration  # Migra feature warmup
npm run script:update-limits     # Actualiza limites masivamente
npm run script:test-matching     # Prueba logica de matching
```

### Desde backend/
```bash
node scripts/migrations/run-migrations.js  # Ejecuta migraciones SQL
node scripts/testing/test-zoho-token.js    # Verifica token Zoho
node scripts/db-checks/check-db.js         # Verifica schema DB
node scripts/gmail/check-gmail-thread.js   # Verifica threading Gmail
```

---

## Tecnologias

| Componente | Tecnologia | Version |
|------------|------------|---------|
| Backend | NestJS + TypeORM | ^11.0 |
| Frontend | Next.js + React | 16.1 / 19.2 |
| Base de datos | PostgreSQL | 14+ |
| Estilos | Tailwind CSS | 4.1 |
| Email | Gmail API (googleapis) | 170+ |
| IA | OpenAI (gpt-4o-mini / gpt-4o) | 6.17+ |
| CRM | Zoho CRM API (EU) | v2 |
| Workflows | n8n (cloud) | - |
| Charts | Recharts | 3.7 |
| Editor | TipTap | 3.18 |
| UI | Radix UI (Dialog, Select) | - |
| Icons | Lucide React | 0.563 |
| Despliegue | Docker + Nginx + Supervisor | Node 20 Alpine |
| Hosting | EasyPanel (VPS 62.84.180.150) | - |

---

## Seguridad

**Archivos sensibles (NUNCA en git):**
- `backend/.env` - Credenciales de DB, Zoho, OpenAI
- `backend/google-creds.json` - Credenciales Google Workspace
- `frontend/.env.local` - URL del backend

El `.gitignore` ya excluye estos archivos.

---

Proyecto privado - Growork. Todos los derechos reservados.
