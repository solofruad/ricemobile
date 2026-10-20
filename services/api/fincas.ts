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

// Crea la finca en el backend a partir de la información recolectada en el formulario local
export async function crearFinca (data: {
  nombre_finca: string | null;
  hectareas: number;
  departamento: string;
  municipio: string;
  vereda: string | null;
}): Promise<FincaPayload> {
  return apiRequest<FincaPayload>(API_FINCAS_PATH, {
    method: "POST",
    body: JSON.stringify({
      nombre: data.nombre_finca ?? "",
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
  return apiRequest<FincaPayload>(`${API_FINCAS_PATH}${remoteId}/`, {
    method: "PATCH",
    body: JSON.stringify({
      nombre: data.nombre_finca ?? "",
      extension: data.hectareas,
      municipio: data.municipio,
      departamento: data.departamento,
      ...(data.vereda ? { vereda: data.vereda } : {}),
    }),
  });
}
