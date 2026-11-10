import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { APP_VERSION } from '@/constants/config';
import ApiRequestLogsTable from '@/database/tables/ApiRequestLogsTable';

export type LogDumpResult = {
  fileUri: string;
  count: number;
};

function timestampForFilename(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// Vuelca TODOS los logs (sin importar el filtro de la vista) a un .json en
// caché y abre la hoja de compartir del sistema. Lanza Error con mensaje
// listo para mostrar si algo falla.
export async function shareLogsDump (): Promise<LogDumpResult> {
  let available = false;
  try {
    available = await Sharing.isAvailableAsync();
  } catch (err) {
    console.log('No se pudo consultar Sharing.isAvailableAsync', err);
    throw new Error('No se pudo abrir la opción de compartir.');
  }
  if (!available) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }

  let logs;
  try {
    logs = await ApiRequestLogsTable.getAllNewestFirst();
  } catch (err) {
    console.log('Error leyendo logs para el dump', err);
    throw new Error('No se pudieron leer los logs.');
  }

  const payload = {
    generated_at: new Date().toISOString(),
    app_version: APP_VERSION,
    count: logs.length,
    logs,
  };

  let fileUri: string;
  try {
    const file = new File(Paths.cache, `riceback-logs-${timestampForFilename()}.json`);
    if (!file.exists) file.create();
    file.write(JSON.stringify(payload, null, 2));
    fileUri = file.uri;
  } catch (err) {
    console.log('Error escribiendo el archivo de dump de logs', err);
    throw new Error('No se pudo generar el archivo de logs.');
  }

  try {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Compartir dump de logs',
      UTI: 'public.json',
    });
  } catch (err) {
    console.log('Error compartiendo el dump de logs', err);
    throw new Error('No se pudo compartir el archivo.');
  }

  return { fileUri, count: logs.length };
}
