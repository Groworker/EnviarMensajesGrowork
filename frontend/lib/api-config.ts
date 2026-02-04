export const getBackendUrl = () => {
    // 1. Cliente: Rutas relativas o variable pública
    if (typeof window !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || '/api';
    }

    // 2. Servidor:

    // Si hay una variable explícita, usarla (Ideal para Docker/EasyPanel)
    if (process.env.BACKEND_URL) return process.env.BACKEND_URL;

    // Fallback de Producción: URL Pública Absoluta
    // Nota: Si esto da error 502 (Loopback), el usuario DEBE configurar BACKEND_URL en EasyPanel
    // apuntando a "http://nombre-servicio:puerto/api"
    if (process.env.NODE_ENV === 'production') {
        return 'https://web-interna-sendmail.5k04a4.easypanel.host/api';
    }

    // Desarrollo local
    return 'http://localhost:3000/api';
};
