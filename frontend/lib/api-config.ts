export const getBackendUrl = () => {
    // 1. Cliente: Usar la variable pública o relativa
    if (typeof window !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || '/api';
    }

    // 2. Servidor: 

    // Si hay una URL interna explícita (para Docker networking)
    if (process.env.BACKEND_URL) return process.env.BACKEND_URL;

    // Si la pública es absoluta, usarla
    const publicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicUrl?.startsWith('http')) return publicUrl;

    // FALLBACK DE PRODUCCIÓN: Usar la URL pública confirmada por el usuario
    if (process.env.NODE_ENV === 'production') {
        return 'https://web-interna-sendmail.5k04a4.easypanel.host/api';
    }

    // Fallback local
    return 'http://localhost:3000/api';
};
