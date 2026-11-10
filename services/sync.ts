import * as Network from "expo-network";
import { File } from "expo-file-system";
import FarmFormTable from "@/database/tables/FarmFormTable";
import MonitorDrawingsTable from "@/database/tables/MonitorDrawingsTable";
import MonitoringsTable from "@/database/tables/MonitoringsTable";
import SamplingsTable, { SamplingRecord } from "@/database/tables/SamplingsTable";
import { API_AUTH_ME_PATH } from "@/constants/config";
import { apiRequest, getToken } from "@/services/api/client";
import { actualizarFinca, crearFinca } from "@/services/api/fincas";
import { crearMonitoreo, esErrorMuestraDuplicada, finalizarMonitoreo, listarMuestras, subirMuestra, vincularTrazado } from "@/services/api/monitoreos";
import { crearTrazado, validarGeometriaTrazado } from "@/services/api/trazados";

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

// MD5 (hex) de la foto local, calculado en nativo. Null si no se puede leer.
function md5FotoLocal (photoDir: string): string | null {
  try {
    const md5 = new File(photoDir).md5;
    return md5 ? md5.toLowerCase() : null;
  } catch {
    return null;
  }
}

// Recupera una muestra rechazada con 400-duplicado (receta 5 + identidad por hash).
// Devuelve true si la muestra quedó marcada como subida (misma captura probada
// por foto_md5) y el sync puede continuar; false si hay que reintentar (throw).
// Nunca marca, borra ni reasigna ante conflicto genuino o falta de evidencia.
async function recuperarMuestraDuplicada (
  monitoreoRemotoId: number,
  sample: Pick<SamplingRecord, "id_monitoring" | "photo_dir" | "index_sampling_point" | "index_photo_in_sampling_point">,
): Promise<boolean> {
  let remoto;
  try {
    const muestras = await listarMuestras(monitoreoRemotoId);
    remoto = muestras.find(m =>
      m.punto_indice === sample.index_sampling_point &&
      m.foto_indice === sample.index_photo_in_sampling_point,
    );
  } catch (err) {
    console.log(`No se pudo listar muestras del monitoreo ${monitoreoRemotoId} para recuperar ${sample.photo_dir} (quedará pendiente)`, err);
    return false;
  }

  if (!remoto) {
    // El undefined del contrato no es éxito: la pareja no existe, reintentar.
    console.log(`Muestra duplicada sin pareja remota en monitoreo ${monitoreoRemotoId} (punto ${sample.index_sampling_point}, foto ${sample.index_photo_in_sampling_point}): quedará pendiente`);
    return false;
  }

  const hashRemoto = remoto.foto_md5?.toLowerCase() ?? null;
  if (!hashRemoto) {
    console.log(`Muestra (punto ${sample.index_sampling_point}, foto ${sample.index_photo_in_sampling_point}) ocupada pero sin foto_md5 verificable: quedará pendiente`);
    return false;
  }

  const hashLocal = md5FotoLocal(sample.photo_dir);
  if (!hashLocal) {
    console.log(`No se pudo calcular el hash local de ${sample.photo_dir}: quedará pendiente`);
    return false;
  }

  if (hashLocal !== hashRemoto) {
    console.log(`Conflicto genuino en monitoreo ${monitoreoRemotoId} (punto ${sample.index_sampling_point}, foto ${sample.index_photo_in_sampling_point}): la foto remota ${remoto.id} es DISTINTA a la local. No se marca ni se reasigna; quedará pendiente`);
    return false;
  }

  await SamplingsTable.markUploaded({
    id_monitoring: sample.id_monitoring,
    index_sampling_point: sample.index_sampling_point,
    index_photo_in_sampling_point: sample.index_photo_in_sampling_point,
    remote_id: remoto.id,
  });
  console.log(`Muestra ${sample.photo_dir} recuperada como subida (misma captura, remoto ${remoto.id})`);
  return true;
}

// Sincroniza con el backend: finca (una sola vez) y monitoreos COMPLETOS
// pendientes (processed = 1) con TODAS sus muestras. Se ejecuta únicamente
// al arrancar la app si hay conexión a internet. No bloquea nada y cualquier
// error deja el dato pendiente para el próximo arranque.
export async function sincronizarAlArranque (): Promise<void> {
  try {
    if (!(await hayConexion())) return;
    await getToken();
    // Validación liviana del token (el cliente re-registra solo ante 401 en cada request;
    // este GET adelanta la detección de token revocado al arranque).
    try {
      await apiRequest(API_AUTH_ME_PATH, { method: "GET" });
    } catch (err) {
      console.log("Aviso: no se pudo validar el token al arranque (se reintentará en cada request)", err);
    }
  } catch (err) {
    console.log("Sincronización abortada: sin acceso al backend", err);
    return;
  }

  const finca = await sincronizarFinca();
  if (finca == null) return;

  // Sin autorización explícita de uso de muestras (No o sin responder),
  // solo se sincroniza la información de la finca; los monitoreos quedan locales.
  if (!finca.autorizaUsoMuestras) {
    console.log("Sincronización de monitoreos omitida: sin autorización de uso de muestras (solo finca)");
    return;
  }

  await sincronizarMonitoreos(finca.fincaId);
}

// Crea la finca en el backend la primera vez que hay información recolectada,
// o la actualiza si hubo ediciones locales pendientes (uploaded = 0).
// Devuelve el id remoto de la finca junto con la autorización de uso de muestras,
// o null si aún no se puede obtener.
export async function sincronizarFinca (): Promise<{ fincaId: number; autorizaUsoMuestras: boolean } | null> {
  let form = null;
  try {
    form = await FarmFormTable.getForm();
  } catch (err) {
    console.log("Error leyendo farm_form durante la sincronización", err);
    return null;
  }

  const hasResponse = !!(form && form.hectareas != null && form.departamento && form.municipio);
  if (!hasResponse || !form) return null;

  // SQLite devuelve 0/1 (y NULL si nunca se preguntó): solo el Sí explícito autoriza.
  const autorizaUsoMuestras = Boolean(form.autoriza_uso_muestras);
  // Contrato 2026-10-22: nombre obligatorio en UI, sin fallback.
  // Si falta, se bloquea el sync hasta completar el formulario (no se inventa dato de negocio).
  const nombreFinca = form.nombre_finca?.trim() ?? "";
  if (!nombreFinca) {
    console.log("Finca sin nombre: sync bloqueado hasta completar el formulario (nombre obligatorio).");
    return null;
  }

  if (form.remote_id == null) {
    try {
      const finca = await crearFinca({
        nombre_finca: nombreFinca,
        hectareas: form.hectareas as number,
        departamento: form.departamento as string,
        municipio: form.municipio as string,
        vereda: form.vereda ?? null,
      });
      await FarmFormTable.setRemoteId(finca.id);
      await FarmFormTable.markUploaded();
      console.log(`Finca "${finca.id}" creada en el backend`);
      return { fincaId: finca.id, autorizaUsoMuestras };
    } catch (err) {
      console.log("No se pudo crear la finca en el backend (quedará pendiente)", err);
      return null;
    }
  }

  if (form.uploaded) return { fincaId: form.remote_id, autorizaUsoMuestras };

  // Edición local pendiente: se actualiza la finca existente en el backend.
  // Si falla, la finca queda pendiente para el próximo arranque, pero igual
  // se retornan los datos para no bloquear la subida de muestras autorizadas.
  try {
    await actualizarFinca(form.remote_id, {
      nombre_finca: nombreFinca,
      hectareas: form.hectareas as number,
      departamento: form.departamento as string,
      municipio: form.municipio as string,
      vereda: form.vereda ?? null,
    });
    await FarmFormTable.markUploaded();
    console.log(`Finca "${form.remote_id}" actualizada en el backend`);
  } catch (err) {
    console.log("No se pudo actualizar la finca en el backend (quedará pendiente)", err);
  }
  return { fincaId: form.remote_id, autorizaUsoMuestras };
}

// Crea (una vez) y reutiliza el trazado del dibujo local en el backend.
// Notas móvil §11 + §4: un trazado por finca, guardar su id y reutilizarlo;
// redibujar = crear uno nuevo (nunca PATCH de geometría en uso → 409).
// Devuelve el trazado remoto o null si la geometría es inválida (400 evitado en local).
async function sincronizarTrazadoParaDrawing (fincaId: number, localDrawingId: number): Promise<number | null> {
  let drawing = null;
  try {
    drawing = await MonitorDrawingsTable.getById(localDrawingId);
  } catch (err) {
    console.log(`Error leyendo dibujo local ${localDrawingId}`, err);
    return null;
  }
  if (!drawing) {
    console.log(`Dibujo local ${localDrawingId} inexistente: monitoreo sin trazado`);
    return null;
  }
  if (drawing.remote_id != null) return drawing.remote_id;

  const errorGeometria = validarGeometriaTrazado(drawing.polygon, drawing.samplingPath);
  if (errorGeometria) {
    console.log(`Trazado local ${localDrawingId} inválido, no se sube (${errorGeometria})`);
    return null;
  }

  try {
    // Contrato: nombre opcional, por defecto vacío y sin autogenerar.
    // No se envía nombre para no inventar dato de negocio (duplicados permitidos).
    const trazado = await crearTrazado(fincaId, {
      polygon: drawing.polygon,
      samplingPath: drawing.samplingPath ?? [],
    });
    await MonitorDrawingsTable.setRemoteId(localDrawingId, trazado.id);
    console.log(`Trazado local ${localDrawingId} creado en el backend con id ${trazado.id}`);
    return trazado.id;
  } catch (err) {
    console.log(`No se pudo crear el trazado del dibujo ${localDrawingId} (quedará pendiente)`, err);
    return null;
  }
}

// Sube al backend SOLO los monitoreos completos (processed = 1) pendientes,
// cada uno con TODAS sus muestras (incluidas sanas con detection vacía).
// Orden: finca → trazado → monitoreo → muestras (§11).
// Cada muestra se envía solo una vez (flag `uploaded`). Los incompletos
// (processed = 0) nunca tocan red, aunque ya tengan remote_id de la lógica anterior.
export async function sincronizarMonitoreos (fincaId: number): Promise<void> {
  let pendientes;
  try {
    pendientes = await MonitoringsTable.getProcessedPendingSync();
  } catch (err) {
    console.log("Error leyendo monitoreos completos pendientes", err);
    return;
  }

  for (const monitoreo of pendientes) {
    try {
      // Contrato 2026-10-22 decisiones.monitoreo_sin_trazado: permitido crear sin
      // trazado_id y vincular después con PATCH. No se descarta trabajo de campo.
      const trazadoId = await sincronizarTrazadoParaDrawing(fincaId, monitoreo.id_monitor_drawing);
      if (trazadoId == null) {
        console.log(`Monitoreo local ${monitoreo.id}: sin trazado válido, se creará sin trazado_id.`);
      }

      let monitoreoRemotoId = monitoreo.remote_id;
      const eraNuevo = monitoreoRemotoId == null;
      if (monitoreoRemotoId == null) {
        const creado = await crearMonitoreo(fincaId, trazadoId);
        await MonitoringsTable.setRemoteId(monitoreo.id, creado.id);
        monitoreoRemotoId = creado.id;
        console.log(`Monitoreo local ${monitoreo.id} creado en el backend con id ${creado.id}${trazadoId != null ? ` (trazado ${trazadoId})` : " (sin trazado)"}`);
      }
      if (monitoreoRemotoId == null) continue;

      // Si el remoto ya existía sin trazado (p. ej. fallo de red al crear el
      // trazado) y ahora el trazado es válido, vincularlo. 400 si las muestras
      // existentes no caben en el recorrido nuevo: se deja sin trazado y se finaliza igual.
      if (!eraNuevo && trazadoId != null) {
        try {
          await vincularTrazado(monitoreoRemotoId, trazadoId);
          console.log(`Monitoreo ${monitoreoRemotoId} vinculado al trazado ${trazadoId}`);
        } catch (err) {
          console.log(`No se pudo vincular trazado ${trazadoId} al monitoreo ${monitoreoRemotoId} (se finaliza sin trazado)`, err);
        }
      }

      await subirMuestrasDelMonitoreo(monitoreoRemotoId, monitoreo.id);

      await finalizarMonitoreo(monitoreoRemotoId);
      await MonitoringsTable.markUploaded(monitoreo.id);
      console.log(`Monitoreo local ${monitoreo.id} sincronizado y finalizado (${monitoreoRemotoId})`);
    } catch (err) {
      console.log(`No se pudo sincronizar el monitoreo local ${monitoreo.id} (quedará pendiente)`, err);
      continue;
    }
  }
}

// Sube cada muestra pendiente del monitoreo completo (marcándolas una por una).
// Incluye muestras sanas (detection vacía) para no sesgar la incidencia.
async function subirMuestrasDelMonitoreo (monitoreoRemotoId: number, monitoreoLocalId: number): Promise<void> {
  const pendientes = await SamplingsTable.getByMonitoringIdPendingUpload(monitoreoLocalId);

  for (const sample of pendientes) {
    const detection = Array.isArray(sample.detection) ? sample.detection : [];

    if (!fotoExiste(sample.photo_dir)) {
      console.log(`Foto inexistente en ${sample.photo_dir}: muestra omitida permanentemente`);
      await SamplingsTable.delete(sample);
      continue;
    }

    try {
      const respuesta = await subirMuestra(monitoreoRemotoId, { ...sample, detection });
      await SamplingsTable.markUploaded({ ...sample, remote_id: respuesta.id });
    } catch (err) {
      // 400-duplicado: la pareja puede ser un reintento de la misma captura
      // (respuesta perdida) o un conflicto genuino. Solo se recupera con
      // identidad probada por hash; en cualquier otro caso se reintenta.
      if (esErrorMuestraDuplicada(err)) {
        const recuperada = await recuperarMuestraDuplicada(monitoreoRemotoId, sample);
        if (recuperada) continue;
      }
      console.log(`No se pudo subir la muestra ${sample.photo_dir} (quedará pendiente)`, err);
      throw err;
    }
  }
}
