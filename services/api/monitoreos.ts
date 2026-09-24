import { apiRequest } from './client';

export type MonitoreoPayloadMonitoreo = {
  id: number;
  finca_id: number;
  estado: string;
};

export type MuestraPayload = {
  id: number;
  monitoreo_id: number;
};

// Crea el monitoreo en el backend (EN_PROGRESO admite muestras desde ya)
export async function crearMonitoreo (fincaId: number): Promise<MonitoreoPayloadMonitoreo> {
  return apiRequest<MonitoreoPayloadMonitoreo>("/api/monitoreos/", {
    method: "POST",
    body: JSON.stringify({ finca_id: fincaId, estado: "EN_PROGRESO" }),
  });
}

// Cierra el monitoreo (transición única: EN_PROGRESO → FINALIZADO)
export async function finalizarMonitoreo (monitoreoId: number): Promise<void> {
  await apiRequest<MonitoreoPayloadMonitoreo>(`/api/monitoreos/${monitoreoId}/`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "FINALIZADO" }),
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
  return apiRequest<MuestraPayload>(`/api/monitoreos/${monitoreoRemotoId}/muestras/`, {
    method: "POST",
    body: form,
  });
}
