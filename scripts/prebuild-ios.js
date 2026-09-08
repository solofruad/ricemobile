/**
 * Genera la carpeta ios/ desde Windows/Linux sin macOS.
 *
 * Expo CLI bloquea `prebuild -p ios` en win32 via
 * node_modules/@expo/cli/.../resolveOptions.js (ensureValidPlatforms). Eso ya
 * esta parcheado con patch-package (ver patches/@expo+cli+54.0.25.patch, se
 * aplica automaticamente en el postinstall), que hace que la funcion nunca
 * descarte ios. Esa causa evitada: parchear process.platform a 'darwin' en
 * este script rompia a `tar` (extraia 0 archivos en silencio) y a `glob`
 * (no encontraba el AppDelegate), porque ambas leen process.platform al
 * cargarse sobre un filesystem NTFS real.
 *
 * Con --no-install nunca se ejecuta `pod install` (eso sí requiere macOS);
 * todo el resto del prebuild (render de plantillas, config plugins, pbxproj)
 * es JS puro y corre igual en Windows.
 *
 * Uso: npm run prebuild:ios
 */
process.env.EXPO_NO_TELEMETRY = '1';
process.argv = [process.argv[0], 'expo', 'prebuild', '-p', 'ios', '--no-install'];
require('@expo/cli');
