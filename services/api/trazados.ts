import { apiTrazadoDetailPath, apiTrazadosListPath } from '@/constants/config';
import { apiRequest, ApiRequestException } from './client';

export type PuntoTrazado = { x: number; y: number; id?: string | number };
export type BBoxTrazado = { min_x: number; min_y: number; max_x: number; max_y: number } | null;

export type TrazadoPayload = {
  id: number;
  finca_id: number;
  nombre: string;
  poligono: PuntoTrazado[];
  recorrido: PuntoTrazado[];
  bbox: BBoxTrazado;
  n_monitoreos: number;
  created_at: string;
  updated_at: string;
};

export function esPuntoFinito (p: unknown): p is PuntoTrazado {
  if (!p || typeof p !== 'object') return false;
  const { x, y } = p as { x: unknown; y: unknown };
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y);
}

// Valida lo que exige el contrato 2026-10-22 (limites): polígono 3..1000
// vértices finitos, recorrido 0..500 puntos finitos. Devuelve error o null.
export function validarGeometriaTrazado (polygon: unknown, samplingPath: unknown): string | null {
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return 'poligono: se requieren al menos 3 vértices.';
  }
  if (polygon.length > 1000) {
    return 'poligono: máximo 1000 vértices.';
  }
  if (!polygon.every(esPuntoFinito)) {
    return 'poligono: todos los vértices deben tener x/y numéricos finitos.';
  }
  if (samplingPath != null && samplingPath !== undefined) {
    if (!Array.isArray(samplingPath)) return 'recorrido: debe ser una lista de puntos.';
    if (samplingPath.length > 500) {
      return 'recorrido: máximo 500 puntos.';
    }
    if (!samplingPath.every(esPuntoFinito)) {
      return 'recorrido: todos los puntos deben tener x/y numéricos finitos.';
    }
  }
  return null;
}

// Crea el trazado en el backend. Acepta los nombres de ricemobile
// (polygon/samplingPath) y los mapea a los canónicos (poligono/recorrido).
export async function crearTrazado (
  fincaId: number,
  data: { nombre?: string | null; polygon: PuntoTrazado[]; samplingPath: PuntoTrazado[] },
): Promise<TrazadoPayload> {
  const error = validarGeometriaTrazado(data.polygon, data.samplingPath);
  if (error) throw new Error(error);
  return apiRequest<TrazadoPayload>(apiTrazadosListPath(fincaId), {
    method: 'POST',
    body: JSON.stringify({
      ...(data.nombre ? { nombre: data.nombre } : {}),
      poligono: data.polygon,
      recorrido: data.samplingPath ?? [],
    }),
  });
}

export async function listarTrazados (fincaId: number): Promise<TrazadoPayload[]> {
  const res = await apiRequest<{ trazados: TrazadoPayload[] }>(apiTrazadosListPath(fincaId), {
    method: 'GET',
  });
  return res.trazados ?? [];
}

// Solo el nombre es editable una vez que un monitoreo usa el trazado (409 en geometría).
export async function actualizarNombreTrazado (trazadoId: number, nombre: string): Promise<TrazadoPayload> {
  return apiRequest<TrazadoPayload>(apiTrazadoDetailPath(trazadoId), {
    method: 'PATCH',
    body: JSON.stringify({ nombre }),
  });
}

export function esErrorTrazadoEnUso (err: unknown): boolean {
  return err instanceof ApiRequestException && err.status === 409;
}
