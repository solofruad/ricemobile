/**
 * Config plugin local para los módulos nativos iOS custom (RiceNative):
 *
 *  1. Inyecta el pod local 'RiceNative' en el Podfile de forma idempotente.
 *     El código fuente del pod vive en la RAIZ del repo (RiceNative/) y se
 *     referencia con '../RiceNative' desde ios/Podfile. Esa ubicación es
 *     CRÍTICA: `expo prebuild --clean` borra y regenera ios/ completa, pero
 *     nunca toca la raíz, así que los módulos nativos siempre sobreviven y
 *     este plugin vuelve a inyectarlos en el Podfile recién generado.
 *  2. Añade los modelos de assets/models/*.tflite (model.tflite legacy
 *     + rice2.tflite YOLO) como recursos del target de la app
 *     (mismo mecanismo que usa react-native-vosk para sus modelos).
 *
 * Al ser un config plugin, sobrevive a `expo prebuild`: cada sincronización
 * re-renderiza Podfile/pbxproj desde las plantillas y este plugin vuelve a
 * aplicar los cambios automáticamente. Nunca editar el Podfile o el pbxproj
 * a mano para esto.
 *
 * NOTA: los paths se normalizan a '/' porque este plugin también corre en
 * Windows (donde path.relative devuelve backslashes y rompería el pbxproj).
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject, IOSConfig } = require('@expo/config-plugins');

const POD_NAME = 'RiceNative';
const POD_PODFILE_LINE = `  pod '${POD_NAME}', :path => '../${POD_NAME}' # injected by plugins/with-ricenative.js`;
// Modelos .tflite de assets/models que se añaden como recurso del target de la app:
// model.tflite = legacy MediaPipe (con NMS embebido), rice2.tflite = YOLO LiteRT + NMS manual.
const MODEL_REL_PATHS = ['assets/models/model.tflite', 'assets/models/rice2.tflite'];

// 1) Pod local en el Podfile
const withRiceNativePodfile = (config) =>
  withDangerousMod(config, ['ios', (configMod) => {
    const podfilePath = path.join(configMod.modRequest.platformProjectRoot, 'Podfile');
    if (!fs.existsSync(podfilePath)) return configMod;
    let contents = fs.readFileSync(podfilePath, 'utf8');
    if (contents.includes(`pod '${POD_NAME}'`)) return configMod;
    // Insertar dentro del bloque target, tras use_expo_modules!
    // (fallback: tras config = use_native_modules!)
    let updated = contents;
    for (const anchor of [/^[ \t]*use_expo_modules!.*$/m, /^[ \t]*config = use_native_modules!.*$/m]) {
      updated = contents.replace(anchor, (match) => `${match}\n${POD_PODFILE_LINE}`);
      if (updated !== contents) break;
    }
    if (updated === contents) {
      throw new Error('[with-ricenative] No se encontró ancla para insertar el pod en el Podfile');
    }
    fs.writeFileSync(podfilePath, updated);
    return configMod;
  }]);

// 2) Modelos .tflite como recursos del target de la app
const withRiceNativeModelResource = (config) =>
  withXcodeProject(config, (configMod) => {
    const project = configMod.modResults;
    const projectRoot = configMod.modRequest.projectRoot;
    const iosRoot = configMod.modRequest.platformProjectRoot;
    for (const relPath of MODEL_REL_PATHS) {
      const fileName = path.basename(relPath);
      if (JSON.stringify(project).includes(fileName)) continue; // idempotente
      const absSource = path.join(projectRoot, relPath);
      if (!fs.existsSync(absSource)) {
        throw new Error(`[with-ricenative] No se encontro el modelo en ${absSource}`);
      }
      const relativePath = path.relative(iosRoot, absSource).split(path.sep).join('/');
      IOSConfig.XcodeUtils.ensureGroupRecursively(project, 'Resources');
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: relativePath,
        groupName: 'Resources',
        project,
        isBuildFile: true,
        verbose: true,
      });
    }
    return configMod;
  });

module.exports = (config) => withRiceNativeModelResource(withRiceNativePodfile(config));
