export const getBackendUrl = () => {
    // Si estamos en el cliente, devolver la variable pública o relativa
    if (typeof window !== 'undefined') {
        return process.env.NEXT_PUBLIC_API_URL || '/api';
    }

    // Si estamos en el servidor:

    // 1. Si hay una URL interna explícita (Docker network), usarla
    if (process.env.BACKEND_URL) return process.env.BACKEND_URL;

    // 2. Si la variable pública es una URL absoluta, usarla
    const publicUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicUrl?.startsWith('http')) return publicUrl;

    // 3. Fallback: URL pública conocida de producción o localhost
    if (process.env.NODE_ENV === 'production') {
        return 'https://web-interna-sendmail.5k04a4.easypanel.host/api';
    }

    return 'http://localhost:3000/api';
};
