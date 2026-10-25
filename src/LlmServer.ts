import { ObjectDetectionResult } from "./ObjectDetection";
import { DetectionRecord } from "@/database/tables/DetectionsTable";
import {
  LLM_CANDIDATE_IPS,
  LLM_CHAT_TIMEOUT_MS,
  LLM_HANDSHAKE_TIMEOUT_PER_IP_MS,
  LLM_PORT,
} from "@/constants/config";
import { logApiRequest, serializeRequestBody, serializeResponseBody } from "@/services/request-logger";

// Re-export por compatibilidad: la fuente única vive en @/constants/config.
export { LLM_PORT } from "@/constants/config";

const CANDIDATE_IPS: string[] = LLM_CANDIDATE_IPS;

export class LlmServerConnectionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LlmServerConnectionError";
	}
}

export class LlmServerChatError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "LlmServerChatError";
	}
}

const fetchWithTimeout = (url: string, options: RequestInit = {}, timeoutMs: number): Promise<Response> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export default class LlmServer {
	baseUrl: string|null = null;

	async handshake(timeoutPerIpMs: number = LLM_HANDSHAKE_TIMEOUT_PER_IP_MS): Promise<string> {
		const results = await Promise.allSettled(
			CANDIDATE_IPS.map(async (ip) => {
				const url = `http://${ip}:${LLM_PORT}/handshake`;
				let response: Response;
				try {
					response = await fetchWithTimeout(url, {}, timeoutPerIpMs);
				} catch (err) {
					logApiRequest({ source: 'llm', method: 'GET', url, request_body: null, response_body: null, status_code: null, error: `Handshake fallido en ${ip}: ${String(err)}` });
					throw new LlmServerConnectionError(`Handshake fallido en ${ip}`);
				}
				const text = await response.text().catch(() => "");
				if (!response.ok) {
					logApiRequest({ source: 'llm', method: 'GET', url, request_body: null, response_body: serializeResponseBody(text), status_code: response.status, error: `Handshake invalido en ${ip}` });
					throw new LlmServerConnectionError(`Handshake invalido en ${ip}`);
				}
				logApiRequest({ source: 'llm', method: 'GET', url, request_body: null, response_body: serializeResponseBody(text), status_code: response.status, error: null });
				return `http://${ip}:${LLM_PORT}`;
			})
		);

		for (const result of results) {
			if (result.status === "fulfilled") {
				this.baseUrl = result.value;
				return result.value;
			}
		}
		throw new LlmServerConnectionError("No se encontró el servidor de LLM en la red");
	}

	async sendMessage(text: string, context?: DetectionRecord["detection"]): Promise<string> {
		if (!this.baseUrl) {
			throw new LlmServerChatError("No hay conexión con el servidor de LLM");
		}

		const body: {message: string, context?: {detections: Array<ObjectDetectionResult>}} = {
			message: text,
		};
		if (context !== undefined) {
			body.context = { detections: context };
		}
		const url = `${this.baseUrl}/chat`;
		const rawBody = JSON.stringify(body);
		const loggedRequestBody = serializeRequestBody(rawBody);

		let response: Response;
		try {
			response = await fetchWithTimeout(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: rawBody,
			}, LLM_CHAT_TIMEOUT_MS);
		} catch (error) {
			logApiRequest({ source: 'llm', method: 'POST', url, request_body: loggedRequestBody, response_body: null, status_code: null, error: `Fallo la peticion al servidor de LLM: ${String(error)}` });
			throw new LlmServerChatError(`Fallo la peticion al servidor de LLM: ${String(error)}`);
		}

		const responseText = await response.text().catch(() => "");
		if (!response.ok) {
			logApiRequest({ source: 'llm', method: 'POST', url, request_body: loggedRequestBody, response_body: serializeResponseBody(responseText), status_code: response.status, error: `El servidor de LLM respondio con error: ${response.status} ${response.statusText}` });
			throw new LlmServerChatError(`El servidor de LLM respondio con error: ${response.status} ${response.statusText}`);
		}

		let json: {response?: string};
		try {
			json = JSON.parse(responseText) as {response?: string};
		} catch {
			logApiRequest({ source: 'llm', method: 'POST', url, request_body: loggedRequestBody, response_body: serializeResponseBody(responseText), status_code: response.status, error: "La respuesta del servidor de LLM no tiene el formato esperado" });
			throw new LlmServerChatError("La respuesta del servidor de LLM no tiene el formato esperado");
		}
		if (typeof json.response !== "string") {
			logApiRequest({ source: 'llm', method: 'POST', url, request_body: loggedRequestBody, response_body: serializeResponseBody(responseText), status_code: response.status, error: "La respuesta del servidor de LLM no tiene el formato esperado" });
			throw new LlmServerChatError("La respuesta del servidor de LLM no tiene el formato esperado");
		}
		logApiRequest({ source: 'llm', method: 'POST', url, request_body: loggedRequestBody, response_body: serializeResponseBody(responseText), status_code: response.status, error: null });
		return json.response;
	}
}
