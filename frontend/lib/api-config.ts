export const getBackendUrl = () => {
    // 1. Cliente: Siempre usa la ruta relativa o la pública definida
    if (typeof window !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || '/api';
    }

    // 2. Servidor:

    // Prioridad 1: Variable explícita de backend (si existe)
    if (process.env.BACKEND_URL) return process.env.BACKEND_URL;

    // Prioridad 2: En Producción, usar la URL interna de Docker proporcionada por el usuario
    if (process.env.NODE_ENV === 'production') {
        // Opción A: Nombre del servicio Docker (lo más probable en EasyPanel)
        return 'http://web_interna_sendmail:4000/api';
    }

    // Prioridad 3: Desarrollo local (Next.js y NestJS corriendo localmente)
    return 'http://localhost:3000/api';
};
