# CV Sender - Sistema Automatizado de Envío de Emails

Sistema que automatiza el envío de CVs por email a ofertas de trabajo, diseñado para agencias de reclutamiento que gestionan múltiples candidatos.

---

## ¿Qué hace este sistema?

Imagina que tienes una agencia de reclutamiento con 100 candidatos buscando trabajo. Cada día aparecen nuevas ofertas de empleo y necesitas enviar los CVs de tus candidatos a esas ofertas. Hacer esto manualmente sería imposible.

**Este sistema lo automatiza:**

1. **Recibe información de candidatos** desde Zoho CRM (tu sistema de gestión de clientes)
2. **Encuentra ofertas relevantes** según el país, ciudad y puesto que busca cada candidato
3. **Envía emails automáticamente** con el CV del candidato a cada oferta
4. **Protege la reputación** de tus emails mediante un sistema de "warmup" (calentamiento gradual)
5. **Te muestra estadísticas** en un panel de control web

---

## ¿Cómo funciona?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DEL SISTEMA                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ZOHO CRM                                                                  │
│   (donde guardas                                                            │
│    tus clientes)                                                            │
│        │                                                                    │
│        ▼ sincroniza cada minuto                                             │
│   ┌─────────────┐                                                           │
│   │  BASE DE    │◄──── Los clientes se copian aquí automáticamente          │
│   │   DATOS     │                                                           │
│   └─────────────┘                                                           │
│        │                                                                    │
│        ▼ cada día a las 6:00 AM                                             │
│   ┌─────────────┐                                                           │
│   │  SCHEDULER  │──── Crea "trabajos de envío" para cada cliente activo     │
│   └─────────────┘                                                           │
│        │                                                                    │
│        ▼ cada minuto                                                        │
│   ┌─────────────┐     ┌──────────────┐                                      │
│   │   WORKER    │────►│ OFERTAS DE   │ Busca ofertas que coincidan          │
│   │             │     │   TRABAJO    │ con lo que busca el cliente          │
│   └─────────────┘     └──────────────┘                                      │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────┐                                                           │
│   │  GMAIL API  │──── Envía el email con el CV                              │
│   └─────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Características principales

### 1. Sincronización con Zoho CRM
- Los datos de tus clientes se sincronizan automáticamente desde Zoho
- Si cambias algo en Zoho (teléfono, email, estado), se actualiza en el sistema
- No necesitas introducir datos manualmente

### 2. Sistema de Matching (coincidencia)
El sistema busca ofertas que coincidan con lo que busca cada cliente:
- **País**: Solo ofertas en los países de interés del cliente
- **Ciudad**: Solo ofertas en las ciudades de interés
- **Puesto**: Solo ofertas relacionadas con el puesto que busca

### 3. Email Warmup (calentamiento)
Cuando creas un email nuevo y empiezas a enviar muchos correos de golpe, los servidores de correo pueden marcarte como spam. El warmup evita esto:

- **Día 1**: Envía 5 emails
- **Día 2**: Envía 7 emails
- **Día 3**: Envía 10 emails
- ... y así hasta llegar al límite que configures (ej: 50/día)

### 4. Dashboard de administración
Panel web donde puedes:
- Ver estadísticas de envíos
- Gestionar clientes
- Configurar límites de envío
- Ver el historial de trabajos

### 5. Control de reputación
- Registra qué emails rebotan (no existen o rechazan)
- Evita enviar a emails problemáticos
- Protege la reputación de tu dominio

---

## Tecnologías utilizadas

| Componente | Tecnología | Para qué sirve |
|------------|------------|----------------|
| Backend | NestJS | El "cerebro" del sistema, procesa toda la lógica |
| Base de datos | PostgreSQL | Almacena clientes, ofertas, historial de envíos |
| Frontend | Next.js + React | El panel de control que ves en el navegador |
| Estilos | Tailwind CSS | Hace que el panel se vea bien |
| Email | Gmail API | Envía los emails usando cuentas de Gmail/Google Workspace |
| CRM | Zoho CRM API | Obtiene los datos de tus clientes |

---

## Estructura del proyecto

```
proyecto/
│
├── backend/                    # Servidor (API)
│   ├── src/
│   │   ├── api/               # Endpoints (URLs que puedes llamar)
│   │   │   ├── clients/       # Gestión de clientes
│   │   │   ├── dashboard/     # Estadísticas
│   │   │   └── job-offers/    # Ofertas de trabajo
│   │   │
│   │   ├── entities/          # Modelos de datos (cómo se guarda la info)
│   │   │   ├── client.entity.ts
│   │   │   ├── job-offer.entity.ts
│   │   │   ├── send-job.entity.ts
│   │   │   └── email-send.entity.ts
│   │   │
│   │   ├── scheduler/         # Programa los envíos diarios (6 AM)
│   │   ├── worker/            # Procesa y envía los emails
│   │   ├── email/             # Conexión con Gmail
│   │   └── zoho/              # Conexión con Zoho CRM
│   │
│   ├── .env.example           # Ejemplo de configuración
│   └── google-creds.json      # Credenciales de Google (NO subir a GitHub)
│
├── frontend/                   # Panel de control web
│   ├── app/                   # Páginas
│   │   ├── page.tsx           # Dashboard principal
│   │   └── clients/           # Página de clientes
│   └── components/            # Componentes reutilizables
│
├── docs/                       # Documentación adicional
│   ├── GETTING_STARTED.md     # Guía de instalación
│   ├── API_DOCUMENTATION.md   # Documentación de la API
│   ├── ZOHO_SETUP.md          # Configuración de Zoho
│   └── CLAUDE.md              # Instrucciones para IA
│
└── README.md                   # Este archivo
```

---

## Requisitos previos

Antes de instalar, necesitas tener:

1. **Node.js v18 o superior**
   - Descarga: https://nodejs.org/
   - Para verificar: `node --version`

2. **PostgreSQL v14 o superior**
   - Descarga: https://www.postgresql.org/download/
   - Es la base de datos donde se guarda todo

3. **Cuenta de Google Workspace**
   - Necesitas una cuenta de Google con un dominio propio
   - Se usa para enviar emails mediante Gmail API

4. **Cuenta de Zoho CRM**
   - Donde tienes guardados tus clientes
   - Necesitarás crear credenciales de API

---

## Instalación paso a paso

### Paso 1: Descargar el proyecto

```bash
git clone <url-del-repositorio>
cd cv-sender
```

### Paso 2: Instalar dependencias

```bash
# Instalar dependencias del proyecto raíz
npm install

# Instalar dependencias del backend
cd backend
npm install
cd ..

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

### Paso 3: Crear la base de datos

Abre PostgreSQL y ejecuta:

```sql
CREATE DATABASE cv_sender_db;
```

### Paso 4: Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp backend/.env.example backend/.env
```

Edita `backend/.env` con tus datos:

```env
# Base de datos
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=tu_contraseña_de_postgres
DATABASE_NAME=cv_sender_db

# Zoho CRM (ver docs/ZOHO_SETUP.md para obtener estos valores)
ZOHO_CLIENT_ID=tu_client_id
ZOHO_CLIENT_SECRET=tu_client_secret
ZOHO_REFRESH_TOKEN=tu_refresh_token
ZOHO_API_DOMAIN=https://www.zohoapis.eu
```

### Paso 5: Configurar Google Credentials

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo
3. Habilita la Gmail API
4. Crea una cuenta de servicio con Domain-Wide Delegation
5. Descarga el JSON y guárdalo como `backend/google-creds.json`

(Ver `docs/GETTING_STARTED.md` para instrucciones detalladas)

### Paso 6: Ejecutar migraciones

```bash
cd backend
npm run migration:run
cd ..
```

### Paso 7: Iniciar el sistema

```bash
# Opción A: Iniciar todo junto (recomendado)
npm run dev

# Opción B: Iniciar por separado
npm run dev:backend   # En una terminal
npm run dev:frontend  # En otra terminal
```

### Paso 8: Acceder al sistema

- **Panel de control**: http://localhost:3001
- **API**: http://localhost:3000

---

## Uso del sistema

### Ver estadísticas
Abre http://localhost:3001 para ver el dashboard con:
- Total de clientes
- Emails enviados hoy
- Trabajos en progreso

### Gestionar clientes
En la sección "Clientes" puedes:
- Ver todos los clientes sincronizados desde Zoho
- Configurar límites de envío
- Activar/desactivar warmup
- Cambiar el estado (activo, pausado, etc.)

### Sincronizar con Zoho
La sincronización es automática (cada minuto), pero puedes forzarla:

```bash
# Sincronizar solo cambios recientes
curl -X POST http://localhost:3000/api/zoho-sync/delta

# Sincronizar todo (primera vez o recuperación)
curl -X POST http://localhost:3000/api/zoho-sync/full
```

### Ejecutar envíos manualmente
El scheduler se ejecuta automáticamente a las 6 AM, pero puedes forzarlo:

```bash
curl -X POST http://localhost:3000/api/scheduler/trigger
```

---

## Tareas automáticas (Cron Jobs)

El sistema ejecuta estas tareas automáticamente:

| Tarea | Cuándo | Qué hace |
|-------|--------|----------|
| **Scheduler** | 6:00 AM cada día | Crea trabajos de envío para clientes activos |
| **Worker** | Cada minuto | Procesa los trabajos y envía emails (5 por ciclo) |
| **Zoho Sync** | Cada minuto | Sincroniza cambios desde Zoho CRM |

---

## Documentación adicional

| Documento | Descripción |
|-----------|-------------|
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Guía detallada de instalación |
| [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Todos los endpoints de la API |
| [docs/ZOHO_SETUP.md](docs/ZOHO_SETUP.md) | Cómo configurar Zoho CRM |

---

## Solución de problemas comunes

### "Error de conexión a la base de datos"
- Verifica que PostgreSQL está corriendo
- Comprueba que las credenciales en `.env` son correctas
- Asegúrate de que la base de datos `cv_sender_db` existe

### "Error de autenticación con Zoho"
- El refresh token puede haber expirado (duran ~1 año)
- Regenera el token siguiendo `docs/ZOHO_SETUP.md`
- Verifica que `ZOHO_API_DOMAIN` coincide con tu región

### "Los emails no se envían"
- Verifica que `google-creds.json` existe en la carpeta backend
- Comprueba que Domain-Wide Delegation está habilitado
- Revisa los logs del backend para ver el error específico

### "No se sincronizan los clientes"
- Verifica las credenciales de Zoho en `.env`
- Ejecuta sync manual: `curl -X POST http://localhost:3000/api/zoho-sync/full`
- Revisa los logs del backend

---

## Seguridad

**IMPORTANTE: Estos archivos contienen información sensible y NUNCA deben subirse a GitHub:**

- `backend/.env` - Contraseñas y tokens
- `backend/google-creds.json` - Credenciales de Google

El archivo `.gitignore` ya está configurado para ignorarlos, pero verifica antes de hacer commit:

```bash
git status
# Asegúrate de que .env y google-creds.json NO aparecen
```

---

## Comandos útiles

```bash
# Desarrollo
npm run dev              # Inicia backend + frontend
npm run dev:backend      # Solo backend (puerto 3000)
npm run dev:frontend     # Solo frontend (puerto 3001)

# Backend
cd backend
npm run build           # Compilar para producción
npm run start:prod      # Ejecutar en producción
npm run test            # Ejecutar tests
npm run lint            # Verificar código

# Base de datos
npm run migration:run    # Ejecutar migraciones pendientes
npm run migration:revert # Revertir última migración
```

---

## Licencia

Proyecto privado - Todos los derechos reservados.

---

Desarrollado con NestJS, Next.js y mucho café.
