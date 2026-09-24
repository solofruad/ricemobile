import * as Network from 'expo-network';
import { FORM_ENDPOINT, INTERVAL_DAYS_SHOW_FORM } from '@/constants/config';
import FarmFormTable, { FarmFormRecord } from '@/database/tables/FarmFormTable';

export type FarmFormPayload = {
  nombre_finca: string | null;
  hectareas: number;
  departamento: string;
  municipio: string;
};

// Decide qué hacer con el formulario de la finca en la fase posterior a la carga inicial.
// - Si no se ha rellenado y ya transcurrió INTERVAL_DAYS_SHOW_FORM desde la última
//   petición, indica que debe mostrarse nuevamente.
// - Si ya se tiene la información y no se ha enviado, intenta enviarla al endpoint
//   cuando haya conexión a internet y el endpoint esté configurado.
export async function processFarmForm (): Promise<{ shouldShowForm: boolean }> {
  let form: FarmFormRecord | null = null;
  try {
    form = await FarmFormTable.getForm();
  } catch (err) {
    console.log("Error leyendo farm_form", err);
    return { shouldShowForm: false };
  }

  const hasResponse = !!(form && form.hectareas != null && form.departamento && form.municipio);

  if (!hasResponse) {
    return { shouldShowForm: shouldRequestForm(form) };
  }

  // Ya hay información recolectada: intentar envío en segundo plano (no bloquea)
  if (form && !form.uploaded) {
    tryUploadFarmForm({
      nombre_finca: form.nombre_finca ?? null,
      hectareas: form.hectareas as number,
      departamento: form.departamento as string,
      municipio: form.municipio as string,
    });
  }

  return { shouldShowForm: false };
}

// Comprueba si han transcurrido INTERVAL_DAYS_SHOW_FORM desde la última vez que se pidió
function shouldRequestForm (form: FarmFormRecord | null): boolean {
  if (!form || !form.last_requested_at) return true;
  const lastRequested = new Date(form.last_requested_at.replace(" ", "T"));
  if (isNaN(lastRequested.getTime())) return true;
  const elapsedDays = (Date.now() - lastRequested.getTime()) / (1000 * 60 * 60 * 24);
  return elapsedDays >= INTERVAL_DAYS_SHOW_FORM;
}

async function tryUploadFarmForm (payload: FarmFormPayload): Promise<void> {
  if (!FORM_ENDPOINT) return; // endpoint aún no configurado: la información queda pendiente

  try {
    const state = await Network.getNetworkStateAsync();
    const isConnected = !!state.isConnected && (state.isInternetReachable ?? true);
    if (!isConnected) return; // sin conexión: se enviará en el próximo arranque

    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await FarmFormTable.markUploaded();
      console.log("Información de la finca enviada exitosamente");
    } else {
      console.log(`Error enviando información de la finca: HTTP ${response.status}`);
    }
  } catch (err) {
    // Sin conexión o error de red: la información queda pendiente para el próximo arranque
    console.log("No se pudo enviar la información de la finca", err);
  }
}

export async function saveFarmFormResponse (data: FarmFormPayload): Promise<void> {
  await FarmFormTable.saveResponse(data);
  tryUploadFarmForm(data);
}
