import { INTERVAL_DAYS_SHOW_FORM } from '@/constants/config';
import FarmFormTable, { FarmFormRecord } from '@/database/tables/FarmFormTable';

export type FarmFormPayload = {
  nombre_finca: string | null;
  hectareas: number;
  departamento: string;
  municipio: string;
  vereda: string | null;
};

// Decide qué hacer con el formulario de la finca en la fase posterior a la carga inicial.
// - Si no se ha rellenado y ya transcurrió INTERVAL_DAYS_SHOW_FORM desde la última
//   petición, indica que debe mostrarse nuevamente.
// - Si ya se tiene la información, la finca se crea en el backend durante la
//   sincronización al arranque (services/sync).
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

  // Ya hay información recolectada: se creará la finca en el backend en la
  // sincronización al arranque (puede quedar pendiente si no hay conexión)

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

export async function saveFarmFormResponse (data: FarmFormPayload): Promise<void> {
  // Guarda la información localmente; la finca se crea en el backend durante la
  // sincronización al arranque (sola vez por dispositivo)
  await FarmFormTable.saveResponse(data);
}
