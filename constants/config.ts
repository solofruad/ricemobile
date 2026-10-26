// Fuente única de constantes de configuración técnica/ajustable del proyecto.
// Los módulos de origen re-exportan desde aquí por compatibilidad; no duplicar valores.

// --- Backend API (antes en services/api/config.ts) ---
export const API_BASE_URL = "https://riceback-backend.onrender.com";

// Código de alta compartido del backend (constante de compilación).
// La identificación individual del dispositivo es el token generado en el registro.
export const DEVICE_JOIN_CODE = "riceMovil-2026_010101";

// El plan gratuito de Render duerme el servicio (~15 min): la primera petición
// puede tardar 30-50s en responder.
export const API_TIMEOUT_MS = 60_000;

// --- Dispositivo / Auth (antes literales en services/api/client.ts) ---
export const DEVICE_TOKEN_KEY = "device_token";
export const DEVICE_PLATFORM = "android";
// Mantener sincronizado con app.json -> expo.version
export const APP_VERSION = "1.0.0";
export const DEVICE_REGISTER_PATH = "/api/auth/devices/register/";
export const API_AUTH_ME_PATH = "/api/auth/me/";
export const API_FINCAS_PATH = "/api/fincas/";
export const API_MONITOREOS_PATH = "/api/monitoreos/";
export const apiTrazadosListPath = (fincaId: number): string => `/api/fincas/${fincaId}/trazados/`;
export const apiTrazadoDetailPath = (trazadoId: number): string => `/api/fincas/trazados/${trazadoId}/`;

// --- Servidor LLM local (antes en src/LlmServer.ts) ---
export const LLM_PORT = 9000;

// Gateways típicos de dispositivos que comparten conexión por hotspot WiFi
export const LLM_CANDIDATE_IPS: string[] = [
  "192.168.43.1", // Hotspot Android (clásico)
  "192.168.150.1", // Hotspot Android (versions recientes)
  "192.168.49.1", // Wi-Fi Direct / hotspot Android
  "192.168.1.1",
  "192.168.0.1",
  "10.0.0.1",
  "172.20.10.1", // Hotspot iPhone
  "192.168.4.1",
  "192.168.123.1",
];

export const LLM_HANDSHAKE_TIMEOUT_PER_IP_MS = 1000;
export const LLM_CHAT_TIMEOUT_MS = 60_000;

// --- Inicialización de la app (antes en hooks/use-app-initialization.ts) ---
export const TTS_LANGUAGE_TAG = "es";
export const OBJECT_DETECTOR_MAX_RESULTS = 7;
export const OBJECT_DETECTOR_SCORE_THRESHOLD = 0.4;
// Preset inicial para testear que MediaPipe+legacy siga funcionando tras portar LiteRT.
// Cambiar a "litert" para probar el modelo nuevo (rice2.tflite + NMS manual).
export const OBJECT_DETECTOR_PRESET = "mediapipe-legacy" as const; //"mediapipe-legacy" | "litert"
export const VOSK_MODEL_NAME = "model-es-es";

// --- Detección / sampling (antes MIN_CONFIDENCE en app/monitoring/samplingUtils.ts) ---
export const DEFAULT_DETECTION_CONFIDENCE_THRESHOLD = 0.3;

// --- SQLite (antes literales en database/Database.ts) ---
export const SQLITE_DIR_NAME = "SQLite";
export const DATABASE_NAME = "detections.db";

// Intervalo de días entre peticiones del formulario de información de la finca
export const INTERVAL_DAYS_SHOW_FORM = 0;

// --- Logs de peticiones (Riceback + LLM local) ---
export const API_LOGS_MAX_ENTRIES = 70;
export const API_LOGS_BODY_MAX_CHARS = 5000;
