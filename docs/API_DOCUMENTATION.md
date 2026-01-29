# Documentación de la API REST

Base URL: `http://localhost:3000`

---

## Índice

1. [Health Check](#1-health-check)
2. [Clientes](#2-clientes)
3. [Dashboard](#3-dashboard)
4. [Ofertas de Trabajo](#4-ofertas-de-trabajo)
5. [Scheduler](#5-scheduler)
6. [Zoho Sync](#6-zoho-sync)

---

## 1. Health Check

### `GET /`

Verifica que el servidor está funcionando.

**Respuesta:**
```
"Hello World!"
```

---

## 2. Clientes

Gestión de clientes del sistema.

### `GET /api/clients`

Obtiene todos los clientes con su configuración de envío.

**Respuesta:**
```json
[
  {
    "id": 1,
    "zohoId": "123456789",
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@email.com",
    "emailOperativo": "juan@tudominio.com",
    "estado": "Envío activo",
    "industria": "Hostelería",
    "jobTitle": "Chef",
    "paisesInteres": ["España", "Portugal"],
    "ciudadesInteres": ["Madrid", "Barcelona"],
    "sendSettings": {
      "id": 1,
      "isWarmupActive": true,
      "currentDailyLimit": 10,
      "targetDailyLimit": 50,
      "matchingCriteria": { "matchMode": "all" }
    }
  }
]
```

---

### `GET /api/clients/:id`

Obtiene un cliente específico por ID.

**Parámetros URL:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID del cliente |

**Respuesta:** Objeto Client (ver arriba)

**Errores:**
- `404` - Cliente no encontrado

---

### `POST /api/clients`

Crea un nuevo cliente.

**Body:**
```json
{
  "zohoId": "123456789",
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@email.com"
}
```

**Respuesta:** `201 Created` - Objeto Client creado

---

### `PUT /api/clients/:id`

Actualiza un cliente existente.

**Parámetros URL:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID del cliente |

**Body:**
```json
{
  "nombre": "Juan Carlos",
  "phone": "+34612345678"
}
```

**Respuesta:** Objeto Client actualizado

---

### `PATCH /api/clients/:id/settings`

Actualiza la configuración de envío de un cliente.

**Parámetros URL:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID del cliente |

**Body:**
```json
{
  "isWarmupActive": true,
  "targetDailyLimit": 50,
  "maxDailyEmails": 100,
  "matchingCriteria": {
    "matchMode": "all",
    "enabledFilters": ["countries", "cities", "jobTitle"]
  }
}
```

**Campos de configuración:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `isWarmupActive` | boolean | Si el warmup está activo |
| `currentDailyLimit` | number | Límite diario actual de emails |
| `targetDailyLimit` | number | Límite objetivo (meta del warmup) |
| `maxDailyEmails` | number | Límite máximo absoluto |
| `matchingCriteria` | object | Criterios de matching |

**Respuesta:** Objeto ClientSendSettings actualizado

---

### `PATCH /api/clients/:id/estado`

Actualiza el estado de un cliente (sincroniza con Zoho CRM).

**Parámetros URL:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID del cliente |

**Body:**
```json
{
  "estado": "Envío activo"
}
```

**Estados válidos:**
- `Envío activo`
- `Entrevista`
- `Contratado`
- `Cerrado`
- `Pausado`

**Respuesta:** Objeto Client actualizado

---

## 3. Dashboard

Estadísticas y trabajos recientes para el panel de control.

### `GET /api/dashboard/stats`

Obtiene estadísticas generales del sistema.

**Respuesta:**
```json
{
  "totalClients": 150,
  "activeClients": 45,
  "totalEmailsSent": 12500,
  "emailsSentToday": 230,
  "jobsInProgress": 12,
  "jobsCompleted": 890
}
```

---

### `GET /api/dashboard/jobs`

Obtiene los trabajos de envío más recientes.

**Respuesta:**
```json
[
  {
    "id": 1,
    "clientId": 5,
    "status": "DONE",
    "emailsToSend": 10,
    "emailsSentCount": 10,
    "createdAt": "2026-01-29T06:00:00.000Z",
    "completedAt": "2026-01-29T06:15:00.000Z",
    "client": {
      "nombre": "María",
      "apellido": "García"
    }
  }
]
```

**Estados de trabajo:**
| Estado | Descripción |
|--------|-------------|
| `QUEUED` | En cola, pendiente de procesar |
| `RUNNING` | Procesando activamente |
| `DONE` | Completado exitosamente |
| `FAILED` | Falló durante el procesamiento |

---

## 4. Ofertas de Trabajo

Consultas sobre las ofertas de trabajo disponibles.

### `GET /api/job-offers/distinct-values`

Obtiene valores únicos de un campo (para filtros en el frontend).

**Parámetros Query:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `field` | string | Sí | Campo a consultar (`pais` o `ciudad`) |

**Ejemplo:**
```bash
GET /api/job-offers/distinct-values?field=pais
```

**Respuesta:**
```json
["España", "Portugal", "Francia", "Italia"]
```

**Errores:**
- `400` - Campo no válido (solo `pais` o `ciudad`)

---

## 5. Scheduler

Control manual del programador de trabajos diarios.

### `POST /api/scheduler/trigger`

Ejecuta manualmente la creación de trabajos diarios (normalmente se ejecuta a las 6 AM).

**Respuesta:**
```json
{
  "message": "Daily jobs triggered manually"
}
```

**¿Qué hace?**
1. Busca clientes con `estado = "Envío activo"`
2. Verifica que no tengan ya un trabajo hoy
3. Aplica lógica de warmup (incrementa límite diario)
4. Crea un `SendJob` para cada cliente activo

---

## 6. Zoho Sync

Sincronización con Zoho CRM.

### `GET /api/zoho-sync/status`

Verifica si hay una sincronización en progreso.

**Respuesta:**
```json
{
  "isSyncing": false
}
```

---

### `POST /api/zoho-sync/delta`

Ejecuta sincronización delta (solo contactos modificados recientemente).

**Respuesta:**
```json
{
  "message": "Delta sync completed",
  "created": 0,
  "updated": 5,
  "skipped": 145
}
```

**¿Qué hace?**
1. Obtiene la fecha más reciente de `zohoModifiedTime` en la BD
2. Consulta Zoho por contactos modificados después de esa fecha
3. Actualiza o crea clientes en la BD local

**Nota:** Este proceso se ejecuta automáticamente cada minuto (configurable).

---

### `POST /api/zoho-sync/full`

Ejecuta sincronización completa (todos los contactos).

**Respuesta:**
```json
{
  "message": "Full sync completed",
  "created": 50,
  "updated": 100,
  "skipped": 0
}
```

**¿Cuándo usar?**
- Primera vez que configuras el sistema
- Después de restaurar la base de datos
- Si sospechas que hay datos desincronizados

**Advertencia:** Hace muchas llamadas a la API de Zoho. Usar con moderación.

---

## Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| `200` | OK - Operación exitosa |
| `201` | Created - Recurso creado |
| `204` | No Content - Sin contenido (éxito) |
| `400` | Bad Request - Datos inválidos |
| `404` | Not Found - Recurso no encontrado |
| `500` | Internal Server Error - Error del servidor |

---

## Formato de Errores

Todas las respuestas de error siguen este formato:

```json
{
  "statusCode": 400,
  "timestamp": "2026-01-29T16:45:00.000Z",
  "path": "/api/clients/999",
  "method": "GET",
  "message": "Client with ID 999 not found"
}
```

---

## Cron Jobs Automáticos

El sistema ejecuta automáticamente:

| Tarea | Frecuencia | Descripción |
|-------|------------|-------------|
| Creación de trabajos | 6:00 AM diario | Crea SendJobs para clientes activos |
| Procesamiento de emails | Cada minuto | Envía emails en batches de 5 |
| Sync Zoho | Cada minuto | Sincroniza cambios desde Zoho CRM |

---

## Ejemplos con cURL

### Listar clientes
```bash
curl http://localhost:3000/api/clients
```

### Actualizar configuración de cliente
```bash
curl -X PATCH http://localhost:3000/api/clients/1/settings \
  -H "Content-Type: application/json" \
  -d '{"targetDailyLimit": 50, "isWarmupActive": true}'
```

### Cambiar estado de cliente
```bash
curl -X PATCH http://localhost:3000/api/clients/1/estado \
  -H "Content-Type: application/json" \
  -d '{"estado": "Envío activo"}'
```

### Sincronizar con Zoho
```bash
curl -X POST http://localhost:3000/api/zoho-sync/delta
```

### Ejecutar scheduler manualmente
```bash
curl -X POST http://localhost:3000/api/scheduler/trigger
```
