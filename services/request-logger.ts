import { API_LOGS_BODY_MAX_CHARS, API_LOGS_MAX_ENTRIES } from '@/constants/config';
import ApiRequestLogsTable, { LogSource } from '@/database/tables/ApiRequestLogsTable';

// Truncado "por pisos": se conservan siempre las keys principales (piso 0)
// y se resume agresivamente el contenido anidado / binario.

const ROOT_STR_LIMIT = 500;
const ROOT_ARRAY_KEEP = 3;
const NESTED_STR_LIMIT = 100;

function truncateString(s: string, limit: number): string {
  if (s.length <= limit) return s;
  return `${s.slice(0, limit)}...[truncado ${s.length}/${s.length}]`;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function summarizeValue(value: unknown, depth: number, arrayKeep: number, strLimit: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return truncateString(value, depth >= 2 ? NESTED_STR_LIMIT : strLimit);

  if (Array.isArray(value)) {
    if (depth >= 2) return `[array(${value.length}) omitido]`;
    const kept = value.slice(0, arrayKeep).map(item => summarizeValue(item, depth + 1, 1, strLimit));
    if (value.length > arrayKeep) {
      return [...kept, `[+${value.length - arrayKeep} más omitidos]`];
    }
    return kept;
  }

  if (isPlainObject(value)) {
    if (depth >= 2) {
      return { __keys: Object.keys(value), __resumen: 'objeto truncado' };
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      out[key] = summarizeValue(value[key], depth + 1, arrayKeep, strLimit);
    }
    return out;
  }

  return truncateString(String(value), strLimit);
}

function fitToBudget(obj: unknown, maxChars: number, strict: boolean): string {
  const arrayKeep = strict ? 1 : ROOT_ARRAY_KEEP;
  const strLimit = strict ? 200 : ROOT_STR_LIMIT;
  const summarized = isPlainObject(obj) || Array.isArray(obj)
    ? summarizeValue(obj, 0, arrayKeep, strLimit)
    : truncateString(String(obj ?? ''), maxChars);
  let text = typeof summarized === 'string' ? summarized : JSON.stringify(summarized);
  if (text.length <= maxChars) return text;
  // Segunda pasada estricta: arrays a 1 elemento, strings más cortos.
  const strictSummarized = isPlainObject(obj) || Array.isArray(obj)
    ? summarizeValue(obj, 0, 1, 100)
    : String(obj ?? '').slice(0, maxChars);
  text = typeof strictSummarized === 'string' ? strictSummarized : JSON.stringify(strictSummarized);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...[truncado]`;
}

function summarizeFormData(form: FormData, maxChars: number): string {
  try {
    const parts = (form as unknown as { _parts?: Array<[string, unknown]> })._parts;
    if (!Array.isArray(parts)) {
      return '[multipart/form-data: contenido binario omitido]';
    }
    const out: Record<string, unknown> = {};
    for (const [key, val] of parts) {
      if (val !== null && typeof val === 'object' && 'uri' in (val as Record<string, unknown>)) {
        const v = val as { type?: string; name?: string };
        out[key] = `[binario ${v.type ?? 'archivo'} omitido]`;
      } else if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try {
          const parsed = JSON.parse(val);
          out[key] = summarizeValue(parsed, 1, ROOT_ARRAY_KEEP, ROOT_STR_LIMIT);
        } catch {
          out[key] = truncateString(val, ROOT_STR_LIMIT);
        }
      } else if (typeof val === 'string') {
        out[key] = truncateString(val, ROOT_STR_LIMIT);
      } else if (val !== null && typeof val === 'object') {
        out[key] = '[binario omitido]';
      } else {
        out[key] = val;
      }
    }
    const text = JSON.stringify(out);
    if (text.length <= maxChars) return text;
    return fitToBudget(out, maxChars, true);
  } catch {
    return '[multipart/form-data: contenido binario omitido]';
  }
}

export function serializeRequestBody(body: unknown): string | null {
  try {
    if (body === null || body === undefined) return null;
    const maxChars = API_LOGS_BODY_MAX_CHARS;
    if (typeof body === 'string' && body.length === 0) return null;
    if (typeof body === 'string') {
      const trimmed = body.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return fitToBudget(JSON.parse(trimmed), maxChars, false);
        } catch {
          return truncateString(body, maxChars);
        }
      }
      return truncateString(body, maxChars);
    }
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      return summarizeFormData(body, maxChars);
    }
    if (isPlainObject(body) || Array.isArray(body)) {
      return fitToBudget(body, maxChars, false);
    }
    return truncateString(String(body), maxChars);
  } catch {
    return null;
  }
}

export function serializeResponseBody(text: string | null | undefined): string | null {
  try {
    if (text === null || text === undefined || text === '') return null;
    const maxChars = API_LOGS_BODY_MAX_CHARS;
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return fitToBudget(JSON.parse(trimmed), maxChars, false);
      } catch {
        return truncateString(text, maxChars);
      }
    }
    return truncateString(text, maxChars);
  } catch {
    return null;
  }
}

export type LogRequestEntry = {
  source: LogSource;
  method: string;
  url: string;
  request_body?: string | null;
  response_body?: string | null;
  status_code?: number | null;
  error?: string | null;
};

// Fire-and-forget: nunca lanza ni bloquea la petición real.
export function logApiRequest(entry: LogRequestEntry): void {
  try {
    ApiRequestLogsTable.insert({
      source: entry.source,
      method: entry.method,
      url: entry.url,
      request_body: entry.request_body ?? null,
      response_body: entry.response_body ?? null,
      status_code: entry.status_code ?? null,
      error: entry.error ?? null,
    })
      .then(() => {
        ApiRequestLogsTable.pruneKeepLast(API_LOGS_MAX_ENTRIES).catch(() => {});
      })
      .catch(() => {});
  } catch {
    // Silencioso a propósito.
  }
}
