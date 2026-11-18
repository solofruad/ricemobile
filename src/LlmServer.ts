import { ObjectDetectionResult } from "./ObjectDetection";
import {
	LLM_BASE_URL,
	LLM_HANDSHAKE_TIMEOUT_MS,
	LLM_MAX_DETECTION_DATA_CHARS,
	LLM_SERVICE,
	LLM_SERVICE_ID,
	LLM_STOP_TIMEOUT_MS,
	LLM_STREAM_IDLE_TIMEOUT_MS,
} from "@/constants/config";
import { logApiRequest, serializeRequestBody, serializeResponseBody } from "@/services/request-logger";

/**
 * Cliente del asistente agrónomo (LLM + YOLO) que corre en el equipo RK3588.
 * Implementa la API v1.1.0 descrita en API_CLIENTE.md:
 *   GET  /handshake      -> identifica el servidor y su estado (ready/loading/error)
 *   POST /new_chat       -> crea la conversación (foto opcional) y responde en SSE
 *   POST /chat           -> continúa la conversación con chat_id, responde en SSE
 *   POST /stop_response  -> detiene la respuesta en curso sin cerrar la conversación
 */

export type LlmServerStatus = "ready" | "loading" | "error";

export type HandshakeInfo = {
	service: string;
	service_id: string;
	version: string;
	status: LlmServerStatus;
	busy: boolean;
	llm_model?: string;
	yolo_model?: string;
	yolo_classes?: string[];
	max_upload_mb?: number;
};

export type LlmFinishReason = "stop" | "cancelled" | "error";

export type LlmStreamError = { code: string; message: string };

export type LlmStreamResult = {
	chatId: string | null;
	finishReason: LlmFinishReason;
	/** Evento `error` recibido dentro del stream (siempre seguido de `done` con finish_reason "error"). */
	error?: LlmStreamError;
	/** Texto completo recibido (concatenación de los eventos `token`). */
	text: string;
};

export type LlmStreamHandlers = {
	onChatId?: (chatId: string) => void;
	onToken?: (text: string) => void;
};

export type LlmStreamRequest = {
	promise: Promise<LlmStreamResult>;
	/** Cierra la conexión del stream; el servidor lo trata como cancelación. */
	abort: () => void;
};

export type StopResponseResult = {
	chat_id: string;
	stopped: boolean;
	partial_response?: string;
	message?: string;
};

export type NewChatContext = {
	/** URI local (file://) de la foto a analizar con YOLO en el servidor. */
	imageUri?: string;
	/** Resultados de detección hechos en el cliente; se ignoran si se envía imagen. */
	detectionData?: unknown;
};

/**
 * Error de la API. `status` es el código HTTP (null si no hubo respuesta) y `code`
 * el código máquina del servidor (§6) o uno local: "unreachable", "wrong_service",
 * "timeout", "invalid_response".
 */
export class LlmApiError extends Error {
	status: number | null;
	code: string;
	constructor(status: number | null, code: string, message: string) {
		super(message);
		this.name = "LlmApiError";
		this.status = status;
		this.code = code;
	}
}

const fetchWithTimeout = (url: string, options: RequestInit = {}, timeoutMs: number): Promise<Response> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

const parseApiError = (status: number, text: string): LlmApiError => {
	try {
		const json = JSON.parse(text) as { error?: { code?: unknown; message?: unknown } };
		if (json?.error && typeof json.error.code === "string") {
			const message = typeof json.error.message === "string" ? json.error.message : `Error ${status}`;
			return new LlmApiError(status, json.error.code, message);
		}
	} catch {
		// cuerpo no JSON
	}
	return new LlmApiError(status, "http_error", `El asistente respondió con error ${status}.`);
};

/**
 * Resume la detección local para enviarla como `detection_data` (máx. ~4000 caracteres).
 */
export const summarizeDetections = (detections: ObjectDetectionResult[] | null | undefined): { pred: string; conf: number }[] => {
	if (!Array.isArray(detections)) return [];
	const out: { pred: string; conf: number }[] = [];
	for (const det of detections) {
		const best = det?.labels?.[0];
		if (!best || typeof best.text !== "string") continue;
		out.push({ pred: best.text, conf: Math.round((best.confidence ?? 0) * 100) / 100 });
	}
	return out;
};

export default class LlmServer {
	readonly baseUrl: string = LLM_BASE_URL;

	/**
	 * GET /handshake. Lanza LlmApiError si el equipo no es accesible o no es el servidor esperado.
	 * No espera a que los modelos carguen: el llamador debe repetirlo mientras status == "loading".
	 */
	async handshake(timeoutMs: number = LLM_HANDSHAKE_TIMEOUT_MS): Promise<HandshakeInfo> {
		const url = `${this.baseUrl}/handshake`;
		let response: Response;
		try {
			response = await fetchWithTimeout(url, {}, timeoutMs);
		} catch (err) {
			logApiRequest({ source: "llm", method: "GET", url, request_body: null, response_body: null, status_code: null, error: `Handshake fallido: ${String(err)}` });
			throw new LlmApiError(null, "unreachable", "No se pudo conectar con el asistente.");
		}
		const text = await response.text().catch(() => "");
		let info: HandshakeInfo | null = null;
		try {
			info = JSON.parse(text) as HandshakeInfo;
		} catch {
			info = null;
		}
		const valid = response.ok && info !== null && info.service === LLM_SERVICE && info.service_id === LLM_SERVICE_ID;
		logApiRequest({
			source: "llm", method: "GET", url, request_body: null,
			response_body: serializeResponseBody(text), status_code: response.status,
			error: valid ? null : "El servidor no se identificó como el asistente agrónomo",
		});
		if (!valid || info === null) {
			throw new LlmApiError(response.status, "wrong_service", "El dispositivo conectado no es el asistente agrónomo.");
		}
		return info;
	}

	/**
	 * POST /new_chat. Con foto se envía multipart/form-data (image_to_detect); sin foto, JSON
	 * con detection_data opcional. Responde en streaming SSE.
	 */
	newChat(message: string, context: NewChatContext, handlers: LlmStreamHandlers): LlmStreamRequest {
		if (context.imageUri) {
			const form = new FormData();
			form.append("message", message);
			const name = context.imageUri.split("/").pop() || "photo.jpg";
			// Formato de archivo de React Native para subir desde una URI local.
			form.append("image_to_detect", { uri: context.imageUri, name, type: "image/jpeg" } as unknown as Blob);
			form.append("stream", "true");
			return this.streamRequest("/new_chat", form, null, handlers);
		}

		const body: { message: string; stream: true; detection_data?: unknown } = { message, stream: true };
		if (context.detectionData !== undefined && context.detectionData !== null) {
			const asText = typeof context.detectionData === "string" ? context.detectionData : JSON.stringify(context.detectionData);
			body.detection_data = asText.length > LLM_MAX_DETECTION_DATA_CHARS
				? asText.slice(0, LLM_MAX_DETECTION_DATA_CHARS)
				: context.detectionData;
		}
		return this.streamRequest("/new_chat", JSON.stringify(body), "application/json", handlers);
	}

	/** POST /chat. Continúa una conversación existente. Responde en streaming SSE. */
	chat(chatId: string, message: string, handlers: LlmStreamHandlers): LlmStreamRequest {
		const body = JSON.stringify({ chat_id: chatId, message, stream: true });
		return this.streamRequest("/chat", body, "application/json", handlers);
	}

	/** POST /stop_response. Detiene la respuesta en curso sin cerrar la conversación. */
	async stopResponse(chatId: string): Promise<StopResponseResult> {
		const url = `${this.baseUrl}/stop_response`;
		const rawBody = JSON.stringify({ chat_id: chatId });
		let response: Response;
		try {
			response = await fetchWithTimeout(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: rawBody,
			}, LLM_STOP_TIMEOUT_MS);
		} catch (err) {
			logApiRequest({ source: "llm", method: "POST", url, request_body: serializeRequestBody(rawBody), response_body: null, status_code: null, error: `stop_response fallido: ${String(err)}` });
			throw new LlmApiError(null, "unreachable", "No se pudo conectar con el asistente.");
		}
		const text = await response.text().catch(() => "");
		logApiRequest({ source: "llm", method: "POST", url, request_body: serializeRequestBody(rawBody), response_body: serializeResponseBody(text), status_code: response.status, error: response.ok ? null : `stop_response respondió ${response.status}` });
		if (!response.ok) {
			throw parseApiError(response.status, text);
		}
		try {
			return JSON.parse(text) as StopResponseResult;
		} catch {
			throw new LlmApiError(response.status, "invalid_response", "Respuesta inesperada del asistente.");
		}
	}

	/**
	 * Petición POST con respuesta Server-Sent Events.
	 * Se usa XMLHttpRequest porque el fetch de React Native no expone el cuerpo como stream;
	 * el XHR de RN entrega el texto de forma incremental (readyState LOADING) en Android e iOS
	 * y acepta FormData con archivos locales.
	 */
	private streamRequest(
		path: string,
		body: string | FormData,
		contentType: string | null,
		handlers: LlmStreamHandlers,
	): LlmStreamRequest {
		const url = `${this.baseUrl}${path}`;
		const xhr = new XMLHttpRequest();
		let abortedByClient = false;
		let timedOut = false;

		const promise = new Promise<LlmStreamResult>((resolve, reject) => {
			let settled = false;
			let processed = 0;
			let pending = "";
			let currentEvent = "";
			let chatId: string | null = null;
			let text = "";
			let streamError: LlmStreamError | undefined;
			let finishReason: LlmFinishReason | null = null;
			let idleTimer: ReturnType<typeof setTimeout> | null = null;

			const log = (status: number | null, error: string | null) => {
				logApiRequest({
					source: "llm", method: "POST", url,
					request_body: serializeRequestBody(body),
					response_body: serializeResponseBody(xhr.responseText ?? null),
					status_code: status,
					error,
				});
			};

			const finish = (fn: () => void) => {
				if (settled) return;
				settled = true;
				if (idleTimer) clearTimeout(idleTimer);
				fn();
			};

			const resetIdleTimer = () => {
				if (idleTimer) clearTimeout(idleTimer);
				idleTimer = setTimeout(() => {
					timedOut = true;
					xhr.abort();
				}, LLM_STREAM_IDLE_TIMEOUT_MS);
			};

			const setChatId = (id: unknown) => {
				if (typeof id === "string" && id && id !== chatId) {
					chatId = id;
					handlers.onChatId?.(id);
				}
			};

			const handleLine = (rawLine: string) => {
				const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
				if (line === "") {
					currentEvent = "";
					return;
				}
				if (line.startsWith("event:")) {
					currentEvent = line.slice(6).trim();
					return;
				}
				if (!line.startsWith("data:")) return; // líneas desconocidas se ignoran
				let data: Record<string, unknown>;
				try {
					data = JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
				} catch {
					return;
				}
				switch (currentEvent) {
					case "chat":
						setChatId(data.chat_id);
						break;
					case "token":
						if (typeof data.text === "string") {
							text += data.text;
							handlers.onToken?.(data.text);
						}
						break;
					case "error":
						streamError = {
							code: typeof data.code === "string" ? data.code : "internal_error",
							message: typeof data.message === "string" ? data.message : "Falló el asistente al generar la respuesta.",
						};
						break;
					case "done": {
						setChatId(data.chat_id);
						const reason = data.finish_reason;
						finishReason = reason === "stop" || reason === "cancelled" || reason === "error" ? reason : "stop";
						break;
					}
				}
			};

			const consume = (final: boolean) => {
				const full = xhr.responseText ?? "";
				if (full.length > processed) {
					pending += full.slice(processed);
					processed = full.length;
				}
				let idx: number;
				while ((idx = pending.indexOf("\n")) >= 0) {
					handleLine(pending.slice(0, idx));
					pending = pending.slice(idx + 1);
				}
				if (final && pending) {
					handleLine(pending);
					pending = "";
				}
			};

			xhr.onreadystatechange = () => {
				if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
					if (xhr.status === 200) setChatId(xhr.getResponseHeader("X-Chat-Id"));
					resetIdleTimer();
				} else if (xhr.readyState === XMLHttpRequest.LOADING) {
					resetIdleTimer();
					if (xhr.status === 200) consume(false);
				}
			};

			xhr.onload = () => {
				if (xhr.status !== 200) {
					const err = parseApiError(xhr.status, xhr.responseText ?? "");
					log(xhr.status, `${err.code}: ${err.message}`);
					finish(() => reject(err));
					return;
				}
				consume(true);
				if (finishReason === null) {
					// El servidor cerró sin enviar `done`.
					finishReason = "error";
					streamError = streamError ?? { code: "incomplete_stream", message: "La conexión se cerró antes de terminar la respuesta." };
				}
				log(xhr.status, finishReason === "error" ? `finish_reason=error ${streamError?.code ?? ""}` : null);
				const result: LlmStreamResult = { chatId, finishReason, error: streamError, text };
				finish(() => resolve(result));
			};

			xhr.onerror = () => {
				log(xhr.status || null, "Error de red en el stream");
				finish(() => reject(new LlmApiError(null, "unreachable", "Se perdió la conexión con el asistente.")));
			};

			xhr.onabort = () => {
				if (timedOut) {
					log(xhr.status || null, "Sin datos del asistente durante demasiado tiempo");
					finish(() => reject(new LlmApiError(null, "timeout", "El asistente dejó de responder.")));
					return;
				}
				log(xhr.status || null, abortedByClient ? "Cancelado por el cliente" : "Abortado");
				consume(true);
				const result: LlmStreamResult = { chatId, finishReason: "cancelled", error: undefined, text };
				finish(() => resolve(result));
			};

			xhr.open("POST", url);
			xhr.responseType = "text";
			xhr.setRequestHeader("Accept", "text/event-stream");
			if (contentType) xhr.setRequestHeader("Content-Type", contentType);
			resetIdleTimer();
			xhr.send(body);
		});

		return {
			promise,
			abort: () => {
				abortedByClient = true;
				xhr.abort();
			},
		};
	}
}
