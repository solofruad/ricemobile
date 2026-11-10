import { apiRequest } from './client';
import { API_FINCAS_PATH } from '@/constants/config';

export type FincaPayload = {
  id: number;
  nombre: string;
  vereda: string;
  municipio: string;
  departamento: string;
  extension: string;
};

// El backend exige nombre no vacío (contrato 2026-10-22, sin fallback).
function exigirNombreFinca (nombre_finca: string | null): string {
  const nombre = nombre_finca?.trim() ?? "";
  if (!nombre) throw new Error("El nombre de la finca es obligatorio.");
  if (nombre.length > 200) throw new Error("El nombre de la finca no puede superar 200 caracteres.");
  return nombre;
}

// Crea la finca en el backend a partir de la información recolectada en el formulario local
export async function crearFinca (data: {
  nombre_finca: string | null;
  hectareas: number;
  departamento: string;
  municipio: string;
  vereda: string | null;
}): Promise<FincaPayload> {
  const nombre = exigirNombreFinca(data.nombre_finca);
  return apiRequest<FincaPayload>(API_FINCAS_PATH, {
    method: "POST",
    body: JSON.stringify({
      nombre,
      extension: data.hectareas,
      municipio: data.municipio,
      departamento: data.departamento,
      ...(data.vereda ? { vereda: data.vereda } : {}),
    }),
  });
}

// Actualiza la finca existente en el backend tras una edición local.
// Campos editables según backend: nombre, extension, vereda, municipio, departamento.
export async function actualizarFinca (remoteId: number, data: {
  nombre_finca: string | null;
  hectareas: number;
  departamento: string;
  municipio: string;
  vereda: string | null;
}): Promise<FincaPayload> {
  const nombre = exigirNombreFinca(data.nombre_finca);
  return apiRequest<FincaPayload>(`${API_FINCAS_PATH}${remoteId}/`, {
    method: "PATCH",
    body: JSON.stringify({
      nombre,
      extension: data.hectareas,
      municipio: data.municipio,
      departamento: data.departamento,
      ...(data.vereda ? { vereda: data.vereda } : {}),
    }),
  });
}
