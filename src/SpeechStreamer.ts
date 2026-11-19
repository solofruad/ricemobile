import { markdownToSpeech } from "./markdownToSpeech";
import { TtsVoices } from "./TtsVoices";

// Si un fragmento no tiene fin de oración en este largo, se corta en la última coma o espacio.
const MAX_FRAGMENT_CHARS = 220;
// Fragmentos más cortos se juntan con el siguiente (evita leer "1." o "Sí." sueltos con pausa).
const MIN_FRAGMENT_CHARS = 12;
// Palabras que terminan en punto sin cerrar la oración (en minúsculas, sin el punto).
const ABBREVIATIONS = new Set([
	"ej", "aprox", "sr", "sra", "srta", "dr", "dra", "ing", "lic", "núm", "num", "pág", "pag", "art", "vs",
]);

const isSpace = (ch: string) => ch === " " || ch === "\t" || ch === "\n" || ch === "\r";

/**
 * Corta el texto acumulado de una respuesta en oraciones listas para leer.
 * - Corta en fin de línea (títulos, ítems de lista y párrafos son unidades) y en `. ? ! …` seguidos de espacio.
 * - No corta en listas numeradas ("1."), decimales ("0.81"), abreviaturas ("p. ej.") ni dentro de una
 *   negrita sin cerrar ("**texto.**").
 * - Si `final` es false, lo que no se pueda decidir todavía queda en `rest` para la próxima llamada.
 */
export function takeSentences(buffer: string, final: boolean): { sentences: string[]; rest: string } {
	const sentences: string[] = [];
	let pending = ""; // fragmentos cortos esperando juntarse con el siguiente
	let start = 0;

	const emit = (raw: string) => {
		const fragment = raw.trim();
		if (!fragment) return;
		pending = pending ? `${pending} ${fragment}` : fragment;
		if (pending.length >= MIN_FRAGMENT_CHARS) {
			sentences.push(pending);
			pending = "";
		}
	};

	let i = start;
	while (i < buffer.length) {
		const ch = buffer[i];
		if (ch === "\n") {
			emit(buffer.slice(start, i));
			start = i + 1;
		} else if (ch === "." || ch === "?" || ch === "!" || ch === "…") {
			const next = buffer[i + 1];
			if (next === undefined && !final) break; // falta ver qué sigue (p. ej. "0." + "81")
			if (next === undefined || isSpace(next)) {
				const segment = buffer.slice(start, i + 1);
				const lineStart = segment.lastIndexOf("\n") + 1;
				const line = segment.slice(lineStart);
				const lastWord = (line.slice(0, -1).split(/\s+/).pop() ?? "").toLowerCase().replace(/[*_(¿¡"]/g, "");
				const isNumberedItem = ch === "." && /^\s*\d+\.$/.test(line);
				const isAbbreviation = ch === "." && (ABBREVIATIONS.has(lastWord) || /^[a-záéíóúñ]$/i.test(lastWord));
				const openBold = (segment.match(/\*\*/g)?.length ?? 0) % 2 === 1;
				if (!isNumberedItem && !isAbbreviation && !openBold) {
					emit(segment);
					start = i + 1;
				}
			}
		}
		i++;
	}

	let rest = buffer.slice(start);

	// Respaldo para frases muy largas sin puntuación final
	while (rest.length > MAX_FRAGMENT_CHARS) {
		const window = rest.slice(0, MAX_FRAGMENT_CHARS);
		const cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "));
		const at = cut > MAX_FRAGMENT_CHARS / 3 ? cut + 1 : window.lastIndexOf(" ");
		if (at <= 0) break;
		emit(rest.slice(0, at));
		rest = rest.slice(at);
	}

	if (final) {
		emit(rest);
		rest = "";
		if (pending) {
			sentences.push(pending);
			pending = "";
		}
	}

	// Lo corto que quedó sin emitir vuelve al inicio del resto para juntarse con lo siguiente.
	if (pending) {
		rest = rest ? `${pending} ${rest}` : pending;
	}
	return { sentences, rest };
}

type SpeechStreamerOptions = {
	speak?: (text: string) => void;
	stop?: () => void;
};

/**
 * Lee en voz alta una respuesta que llega en streaming, oración por oración, encolándolas en el TTS nativo.
 * push(token) con cada fragmento, finish() al terminar bien y cancel() para callar e ignorar lo que siga llegando.
 */
export class SpeechStreamer {
	private buffer = "";
	private cancelled = false;
	private readonly speak: (text: string) => void;
	private readonly stopVoice: () => void;

	constructor(options: SpeechStreamerOptions = {}) {
		this.speak = options.speak ?? ((text) => { TtsVoices.enqueue(text); });
		this.stopVoice = options.stop ?? (() => TtsVoices.stop());
	}

	push(token: string) {
		if (this.cancelled) return;
		this.buffer += token;
		this.drain(false);
	}

	finish() {
		if (this.cancelled) return;
		this.drain(true);
	}

	cancel() {
		if (this.cancelled) return;
		this.cancelled = true;
		this.buffer = "";
		this.stopVoice();
	}

	private drain(final: boolean) {
		const { sentences, rest } = takeSentences(this.buffer, final);
		this.buffer = rest;
		for (const sentence of sentences) {
			const speech = markdownToSpeech(sentence);
			if (speech) this.speak(speech);
		}
	}
}
