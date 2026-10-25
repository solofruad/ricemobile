import { apiRequest } from './client';
import { API_MONITOREOS_PATH } from '@/constants/config';

export type MonitoreoPayloadMonitoreo = {
  id: number;
  finca_id: number;
  trazado_id?: number | null;
  estado: string;
};

export type MuestraPayload = {
  id: number;
  monitoreo_id: number;
};

// Crea el monitoreo en el backend (EN_PROGRESO admite muestras desde ya).
// Si se pasa trazadoId, se vincula al trazado de la misma finca (§6).
export async function crearMonitoreo (fincaId: number, trazadoId?: number | null): Promise<MonitoreoPayloadMonitoreo> {
  return apiRequest<MonitoreoPayloadMonitoreo>(API_MONITOREOS_PATH, {
    method: "POST",
    body: JSON.stringify({
      finca_id: fincaId,
      estado: "EN_PROGRESO",
      ...(trazadoId != null ? { trazado_id: trazadoId } : {}),
    }),
  });
}

// Cierra el monitoreo (transición única: EN_PROGRESO → FINALIZADO)
export async function finalizarMonitoreo (monitoreoId: number): Promise<void> {
  await apiRequest<MonitoreoPayloadMonitoreo>(`${API_MONITOREOS_PATH}${monitoreoId}/`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "FINALIZADO" }),
  });
}

// Vincula (o desvincula con null) el trazado de un monitoreo existente.
// Valida que las muestras existentes quepan en el recorrido nuevo (400 si no).
export async function vincularTrazado (monitoreoId: number, trazadoId: number | null): Promise<MonitoreoPayloadMonitoreo> {
  return apiRequest<MonitoreoPayloadMonitoreo>(`${API_MONITOREOS_PATH}${monitoreoId}/`, {
    method: "PATCH",
    body: JSON.stringify({ trazado_id: trazadoId }),
  });
}

// Sube una muestra (foto + detecciones) como multipart. `detecciones` viaja
// como STRING JSON con el resultado del detector tal cual (ObjectDetectionResult[]).
export async function subirMuestra (
  monitoreoRemotoId: number,
  data: {
    photo_dir: string;
    index_sampling_point: number;
    index_photo_in_sampling_point: number;
    detection: unknown;
  },
): Promise<MuestraPayload> {
  const form = new FormData();
  form.append("foto", {
    uri: data.photo_dir,
    name: `muestra_${data.index_sampling_point}_${data.index_photo_in_sampling_point}.jpg`,
    type: "image/jpeg",
  } as unknown as Blob);
  form.append("punto_indice", String(data.index_sampling_point));
  form.append("foto_indice", String(data.index_photo_in_sampling_point));
  form.append("detecciones", JSON.stringify(data.detection));
  return apiRequest<MuestraPayload>(`${API_MONITOREOS_PATH}${monitoreoRemotoId}/muestras/`, {
    method: "POST",
    body: form,
  });
}
