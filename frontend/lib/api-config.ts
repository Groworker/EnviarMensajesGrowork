export const getBackendUrl = () => {
    // 1. Cliente: Siempre usa la ruta relativa o la pública definida
    if (typeof window !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || '/api';
    }

    // 2. Servidor:

    // Prioridad 1: Variable explícita de backend
    if (process.env.BACKEND_URL) return process.env.BACKEND_URL;

    // Prioridad 2: En Producción, intentar localhost primero (mismo contenedor/pod)
    // Esto resuelve problemas de loopback 502 en EasyPanel si el servicio es el mismo
    if (process.env.NODE_ENV === 'production') {
        return 'http://127.0.0.1:4000/api';
    }

    // Fallback local dev
    return 'http://localhost:3000/api';
};
