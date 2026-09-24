import * as Network from "expo-network";
import { File } from "expo-file-system";
import FarmFormTable from "@/database/tables/FarmFormTable";
import MonitoringsTable from "@/database/tables/MonitoringsTable";
import SamplingsTable from "@/database/tables/SamplingsTable";
import { getToken } from "@/services/api/client";
import { crearFinca } from "@/services/api/fincas";
import { crearMonitoreo, finalizarMonitoreo, subirMuestra } from "@/services/api/monitoreos";

// Comprueba si hay conexión a internet disponible
export async function hayConexion (): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return !!state.isConnected && (state.isInternetReachable ?? true);
  } catch (err) {
    console.log("No se pudo consultar el estado de la red", err);
    return false;
  }
}

function fotoExiste (photoDir: string): boolean {
  try {
    const file = new File(photoDir);
    return file.exists;
  } catch {
    return false;
  }
}

// Sincroniza con el backend: finca (una sola vez) y monitoreos pendientes con sus muestras.
// Se ejecuta únicamente al arrancar la app si hay conexión a internet. No bloquea
// nada y cualquier error deja el dato pendiente para el próximo arranque.
export async function sincronizarAlArranque (): Promise<void> {
  try {
    if (!(await hayConexion())) return;
    await getToken();
  } catch (err) {
    console.log("Sincronización abortada: sin acceso al backend", err);
    return;
  }

  const fincaId = await sincronizarFinca();
  if (fincaId == null) return;

  await sincronizarMonitoreos(fincaId);
}

// Crea la finca en el backend la primera vez que hay información recolectada.
// Devuelve el id remoto de la finca, o null si aún no se puede obtener.
export async function sincronizarFinca (): Promise<number | null> {
  let form = null;
  try {
    form = await FarmFormTable.getForm();
  } catch (err) {
    console.log("Error leyendo farm_form durante la sincronización", err);
    return null;
  }

  const hasResponse = !!(form && form.hectareas != null && form.departamento && form.municipio);
  if (!hasResponse || !form) return null;

  if (form.remote_id != null) return form.remote_id;

  try {
    const finca = await crearFinca({
      nombre_finca: form.nombre_finca ?? null,
      hectareas: form.hectareas as number,
      departamento: form.departamento as string,
      municipio: form.municipio as string,
      vereda: form.vereda ?? null,
    });
    await FarmFormTable.setRemoteId(finca.id);
    await FarmFormTable.markUploaded();
    console.log(`Finca "${finca.id}" creada en el backend`);
    return finca.id;
  } catch (err) {
    console.log("No se pudo crear la finca en el backend (quedará pendiente)", err);
    return null;
  }
}

// Sube al backend los monitoreos locales pendientes, cada uno con sus muestras
// (fotos incluidas). Cada muestra se envía solo una vez (flag `uploaded`).
async function sincronizarMonitoreos (fincaId: number): Promise<void> {
  let pendientes;
  try {
    pendientes = await MonitoringsTable.getPendingSync();
  } catch (err) {
    console.log("Error leyendo monitoreos pendientes", err);
    return;
  }

  for (const monitoreo of pendientes) {
    try {
      let monitoreoRemotoId = monitoreo.remote_id;
      if (monitoreoRemotoId == null) {
        const creado = await crearMonitoreo(fincaId);
        await MonitoringsTable.setRemoteId(monitoreo.id, creado.id);
        monitoreoRemotoId = creado.id;
        console.log(`Monitoreo local ${monitoreo.id} creado en el backend con id ${creado.id}`);
      }
      if (monitoreoRemotoId == null) continue;

      await subirMuestrasDelMonitoreo(monitoreoRemotoId, monitoreo.id);

      if (monitoreo.processed) {
        await finalizarMonitoreo(monitoreoRemotoId);
        await MonitoringsTable.markUploaded(monitoreo.id);
        console.log(`Monitoreo local ${monitoreo.id} sincronizado y finalizado (${monitoreoRemotoId})`);
      }
    } catch (err) {
      console.log(`No se pudo sincronizar el monitoreo local ${monitoreo.id} (quedará pendiente)`, err);
      break;
    }
  }
}

// Sube cada muestra pendiente del monitoreo local (marcándolas una por una)
async function subirMuestrasDelMonitoreo (monitoreoRemotoId: number, monitoreoLocalId: number): Promise<void> {
  const pendientes = await SamplingsTable.getByMonitoringIdPendingUpload(monitoreoLocalId);

  for (const sample of pendientes) {
    if (!Array.isArray(sample.detection)) continue;
    if (!sample.detection.length) continue;

    if (!fotoExiste(sample.photo_dir)) {
      console.log(`Foto inexistente en ${sample.photo_dir}: muestra omitida permanentemente`);
      await SamplingsTable.delete(sample);
      continue;
    }

    try {
      const respuesta = await subirMuestra(monitoreoRemotoId, sample);
      await SamplingsTable.markUploaded({ ...sample, remote_id: respuesta.id });
    } catch (err) {
      console.log(`No se pudo subir la muestra ${sample.photo_dir} (quedará pendiente)`, err);
      throw err;
    }
  }
}
