export const API_BASE_URL = "https://riceback-backend.onrender.com";

// Código de alta compartido del backend (constante de compilación).
// La identificación individual del dispositivo es el token generado en el registro.
export const DEVICE_JOIN_CODE = "riceMovil-2026_010101";

// El plan gratuito de Render duerme el servicio (~15 min): la primera petición
// puede tardar 30-50s en responder.
export const API_TIMEOUT_MS = 60_000;
