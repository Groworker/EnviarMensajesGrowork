# Gestión de Cuentas de Correo de Google Workspace (Correos Corporativos)

Este documento explica cómo funciona el sistema de gestión y borrado automático de los correos corporativos asociados a los clientes en la aplicación.

## 📌 ¿Qué hace este módulo?

El módulo de **Correos Corporativos** se conecta directamente con tu cuenta de organización de Google Workspace (usando los permisos de administrador de `admin@personalwork.es`). Su objetivo principal es:

1. **Monitorear** qué clientes tienen correos operativos y usarlos de manera segura.
2. **Auto-gestionar el ciclo de vida** de estos correos para no acumular licencias innecesarias que supongan un coste extra.
3. **Proteger tu dominio** actuando rápidamente ante comportamientos que puedan dañar la reputación (como enviar correos a cuentas inexistentes que rebotan).

---

## 🗑️ ¿Cuándo se borra automáticamente un correo?

Existe un proceso automático (Cron Job) en el servidor que se ejecuta **cada hora**. Este proceso evalúa a todos los clientes activos con correo corporativo bajo **3 reglas principales**. 

Si un cliente cumple **cualquiera** de estas 3 reglas, su correo se marcará para borrado preventivo:

### 1. Estado "Cerrado" en Zoho CRM
Si el cliente finaliza su relación con Groworker, no necesita mantener el correo.
* **Condición**: El estado en Zoho debe ser **"Closed"** (Cerrado).
* **Motivo necesario**: El motivo del cierre debe ser explícitamente uno de estos:
  * *Contratad@*
  * *Sin correos restantes*
  * *Baja del Cliente*
  * *Problemas Técnicos*

### 2. Inactividad Prolongada (3 Días)
Si se le ha creado un correo a un cliente pero el sistema detecta que no lo está usando (no se envían correos desde esa cuenta), se procede a cerrarla para liberar la licencia.
* **Condición**: Han pasado **más de 3 días** desde que se le creó el correo corporativo.
* **Uso**: El último correo enviado desde esa cuenta fue hace más de 3 días (o nunca ha enviado ninguno).

### 3. Exceso de Rebotes (Bounces)
Si los envíos desde una cuenta corporativa están fallando constantemente porque los destinatarios no existen, esto perjudica gravemente la reputación general de todo tu dominio de envío.
* **Condición**: La cuenta ha acumulado **más de 5 correos rebotados (BOUNCED)** en los últimos **7 días**. 
* *Nota: En cuanto esto sucede, se detiene la cuenta para proteger el dominio.*

---

## ⏳ El Periodo de Gracia (48 Horas)

**¡Muy Importante!** Cuando el sistema automático detecta que un correo cumple alguna de las 3 reglas anteriores, **NO lo borra al instante**. 

En su lugar, el correo entra en un **Periodo de Gracia de 48 horas**.

* **¿Para qué sirve?** Te da un margen de tiempo por si el cliente fue cerrado por error en Zoho, o si quieres conservar la cuenta temporalmente por causas de fuerza mayor.
* ¿Qué pasa después de 48h? Si nadie ha cancelado el borrado, el sistema **elimina permanentemente** el usuario del panel de administración de Google Workspace, lo cual destruye la cuenta y libera la licencia mensual.

---

## 💻 Gestión Manual desde el Panel de Control

Puedes administrar todo esto cómodamente desde la pantalla de la aplicación:

### La pestaña de "Correos Corp."

Desde el menú principal (Navbar) puedes acceder a la nueva sección **Correos Corp.**. En esta pantalla podrás:

* **Ver métricas en tiempo real**: Cuántos correos activos tienes, en qué dominios están repartidos, y cuántos están agendados para ser borrados pronto.
* **Ver el Periodo de Gracia**: Los correos marcados para borrado tendrán una etiqueta roja de "Borrado Pendiente". Ahí mismo verás **el motivo exacto** (ej. "Inactividad prolongada") y la fecha límite.
* **Acciones Manuales**:
  * ❌ **Cancelar Borrado**: Puedes usar el botón de Cancelar en los correos que estén en periodo de gracia. Esto los devolverá a la normalidad (aunque si siguen cumpliendo las condiciones, el sistema los volverá a marcar en la próxima hora).
  * 🗑️ **Borrar Inmediatamente**: Si quieres saltarte la espera de las 48 horas o borrar a un usuario por tu propia cuenta, pulsa el botón rojo de Borrar. Esto se conecta a Google y lo elimina al instante de forma segura.

---

### Notas Técnicas / Requisitos Funcionales
* El borrado se efectúa a través de la cuenta de servicio (Service Account) con delegación de dominio, personificando a `admin@personalwork.es`.
* Cuando un correo se borra, en la base de datos de tu aplicación el cliente no se elimina, tan solo se "limpian" sus campos de correo operativo para reflejar que ya no posee uno activo.
