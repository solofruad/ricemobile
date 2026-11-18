// Android rechaza textos mayores que TextToSpeech.getMaxSpeechInputLength() (4000);
// se deja margen y se corta en el último fin de oración.
const MAX_SPEECH_CHARS = 3900;

/**
 * Convierte una respuesta en Markdown del asistente en texto plano para leerlo con el TTS:
 * quita las marcas que se leerían literalmente (#, **, viñetas, `código`, enlaces) y
 * convierte los saltos de línea en pausas.
 */
export function markdownToSpeech(markdown: string): string {
	const lines = markdown
		.replace(/```[\s\S]*?```/g, " ") // bloques de código
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // imágenes
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // enlaces
		.split(/\r?\n/)
		.map((line) =>
			line
				.replace(/^\s{0,3}#{1,6}\s*/, "") // títulos
				.replace(/^\s*>\s?/, "") // citas
				.replace(/^\s*[-*+]\s+/, "") // viñetas
				.replace(/^\s*[-*_]{3,}\s*$/, "") // separadores
				.replace(/(\*\*|__)(.+?)\1/g, "$2") // negrita
				.replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, "$1$2") // cursiva
				.replace(/`([^`]*)`/g, "$1") // código en línea
				.replace(/[*_`#]/g, "") // marcas sueltas
				.trim()
		)
		.filter((line) => line.length > 0);

	// Cada línea es una pausa: se termina con punto si no trae puntuación final.
	let text = lines.map((line) => (/[.!?:;,]$/.test(line) ? line : `${line}.`)).join(" ");
	text = text.replace(/\s{2,}/g, " ").trim();

	if (text.length > MAX_SPEECH_CHARS) {
		const clipped = text.slice(0, MAX_SPEECH_CHARS);
		const lastSentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("? "), clipped.lastIndexOf("! "));
		text = lastSentenceEnd > MAX_SPEECH_CHARS / 2 ? clipped.slice(0, lastSentenceEnd + 1) : clipped;
	}
	return text;
}
