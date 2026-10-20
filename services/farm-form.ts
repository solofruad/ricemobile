import { INTERVAL_DAYS_SHOW_FORM } from '@/constants/config';
import FarmFormTable, { FarmFormRecord } from '@/database/tables/FarmFormTable';

export type FarmFormPayload = {
  nombre_finca: string | null;
  hectareas: number;
  departamento: string;
  municipio: string;
  vereda: string | null;
  autoriza_uso_muestras: boolean;
};

export type FarmFormDraft = {
  nombreFinca: string;
  hectareas: string;
  departamento: string | null;
  municipio: string | null;
  vereda: string;
  autorizaUsoMuestras: boolean | null;
};

// Acepta coma o punto decimal. Retorna null si no es un número positivo.
export function parseHectareas (raw: string): number | null {
  const parsed = parseFloat(raw.replace(",", "."));
  if (raw.trim() === "" || isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

// Validación compartida por el modal inicial y la pestaña Usuario.
// Retorna el mensaje de error o null si el borrador es válido.
export function validateFarmForm (draft: Pick<FarmFormDraft, "hectareas" | "departamento" | "municipio" | "autorizaUsoMuestras">): string | null {
  if (parseHectareas(draft.hectareas) == null) {
    return "Ingresa una extensión válida en hectáreas.";
  }
  if (!draft.departamento) {
    return "Selecciona el departamento.";
  }
  if (!draft.municipio) {
    return "Selecciona el municipio más cercano.";
  }
  if (draft.autorizaUsoMuestras == null) {
    return "Debes indicar si autorizas el uso de las muestras de tus monitoreos.";
  }
  return null;
}

// Construye el payload listo para guardar. Retorna error si no es válido.
export function buildFarmFormPayload (draft: FarmFormDraft): { payload: FarmFormPayload } | { error: string } {
  const validationError = validateFarmForm(draft);
  if (validationError) return { error: validationError };
  return {
    payload: {
      nombre_finca: draft.nombreFinca.trim() || null,
      hectareas: parseHectareas(draft.hectareas) as number,
      departamento: draft.departamento as string,
      municipio: draft.municipio as string,
      vereda: draft.vereda.trim() || null,
      autoriza_uso_muestras: draft.autorizaUsoMuestras as boolean,
    },
  };
}

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
