import { Platform } from "react-native";

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
export const DEVICE_PLATFORM = Platform.OS;
// Mantener sincronizado con app.json -> expo.version
export const APP_VERSION = "1.0.0";
export const DEVICE_REGISTER_PATH = "/api/auth/devices/register/";
export const API_AUTH_ME_PATH = "/api/auth/me/";
export const API_FINCAS_PATH = "/api/fincas/";
export const API_MONITOREOS_PATH = "/api/monitoreos/";
export const apiTrazadosListPath = (fincaId: number): string => `/api/fincas/${fincaId}/trazados/`;
export const apiTrazadoDetailPath = (trazadoId: number): string => `/api/fincas/trazados/${trazadoId}/`;

// --- Asistente agrónomo local (LLM + YOLO en Radxa ROCK 5C) — API v1.1.0 ---
// El equipo crea el hotspot Wi-Fi "RKLLM-AP" (sin internet) y siempre está en 10.42.0.1:8080.
export const LLM_SSID = "RKLLM-AP";
export const LLM_BASE_URL = "http://10.42.0.1:8080";
// Valores que /handshake debe devolver para confirmar que hablamos con el equipo correcto.
export const LLM_SERVICE = "llm-agro-server";
export const LLM_SERVICE_ID = "rk3588-agro";

// /handshake: timeout corto; mientras status == "loading" se repite cada 2-3 s.
export const LLM_HANDSHAKE_TIMEOUT_MS = 3000;
export const LLM_HANDSHAKE_POLL_MS = 2500;
// Tiempo máximo sin recibir fragmentos del stream SSE (/new_chat, /chat).
export const LLM_STREAM_IDLE_TIMEOUT_MS = 120_000;
// /stop_response espera a que el motor se detenga (normalmente < 1 s).
export const LLM_STOP_TIMEOUT_MS = 10_000;
export const LLM_MAX_MESSAGE_CHARS = 2000;
export const LLM_MAX_DETECTION_DATA_CHARS = 4000;

// --- Inicialización de la app (antes en hooks/use-app-initialization.ts) ---
export const TTS_LANGUAGE_TAG = "es";
// Intervalo entre consultas a TtsVoices.isSpeaking() mientras se lee una respuesta en el chat
// (mantiene visible el botón de detener hasta que la voz termina).
export const TTS_SPEAKING_POLL_MS = 800;
export const OBJECT_DETECTOR_MAX_RESULTS = 7;
export const OBJECT_DETECTOR_SCORE_THRESHOLD = 0.3;
// Preset inicial para testear que MediaPipe+legacy siga funcionando tras portar LiteRT.
// Cambiar a "litert" para probar el modelo nuevo (rice2.tflite + NMS manual).
export const OBJECT_DETECTOR_PRESET = "litert" as const; //"mediapipe-legacy" | "litert"
export const VOSK_MODEL_NAME = "model-es-es";

// --- Detección / sampling (antes MIN_CONFIDENCE en app/monitoring/samplingUtils.ts) ---
export const DEFAULT_DETECTION_CONFIDENCE_THRESHOLD = 0.3;

// --- SQLite (antes literales en database/Database.ts) ---
export const SQLITE_DIR_NAME = "SQLite";
export const DATABASE_NAME = "detections.db";

// Intervalo de días entre peticiones del formulario de información de la finca
export const INTERVAL_DAYS_SHOW_FORM = 15;

// --- Logs de peticiones (Riceback + LLM local) ---
export const API_LOGS_MAX_ENTRIES = 70;
export const API_LOGS_BODY_MAX_CHARS = 5000;
