import { ObjectDetectionResult } from "./ObjectDetection";
import { DetectionRecord } from "@/database/tables/DetectionsTable";

export const LLM_PORT = 9000;

// Gateways típicos de dispositivos que comparten conexión por hotspot WiFi
const CANDIDATE_IPS: Array<string> = [
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

	async handshake(timeoutPerIpMs: number = 1000): Promise<string> {
		const results = await Promise.allSettled(
			CANDIDATE_IPS.map(async (ip) => {
				const response = await fetchWithTimeout(`http://${ip}:${LLM_PORT}/handshake`, {}, timeoutPerIpMs);
				if (!response.ok) {
					throw new LlmServerConnectionError(`Handshake invalido en ${ip}`);
				}
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

		let response: Response;
		try {
			response = await fetchWithTimeout(`${this.baseUrl}/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			}, 60000);
		} catch (error) {
			throw new LlmServerChatError(`Fallo la peticion al servidor de LLM: ${String(error)}`);
		}

		if (!response.ok) {
			throw new LlmServerChatError(`El servidor de LLM respondio con error: ${response.status} ${response.statusText}`);
		}

		const json = await response.json() as {response?: string};
		if (typeof json.response !== "string") {
			throw new LlmServerChatError("La respuesta del servidor de LLM no tiene el formato esperado");
		}
		return json.response;
	}
}
