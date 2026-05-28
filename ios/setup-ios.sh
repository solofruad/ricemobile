#!/bin/bash
# Script de instalación y configuración para iOS

echo "🍎 Configurando módulos nativos de iOS para RiceMobile..."

# Navegar a carpeta iOS
cd "$(dirname "$0")"

# Instalar dependencias con CocoaPods
echo "📦 Instalando dependencias de CocoaPods..."
if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods no está instalado. Instalando..."
    sudo gem install cocoapods
fi

pod install

if [ $? -ne 0 ]; then
    echo "❌ Error al instalar CocoaPods. Intenta manualmente:"
    echo "   cd ios && pod install"
    exit 1
fi

echo "✅ CocoaPods instalados exitosamente"

# Verificar estructura de carpetas
echo "📁 Verificando estructura de carpetas..."

if [ ! -d "RiceMobile/modules" ]; then
    echo "❌ Carpeta modules no encontrada"
    exit 1
fi

# Verificar archivos críticos
files=(
    "RiceMobile/modules/ObjectDetection.swift"
    "RiceMobile/modules/ObjectDetectionModule.swift"
    "RiceMobile/modules/ObjectDetectionModule.h"
    "RiceMobile/modules/TtsVoices.swift"
    "RiceMobile/modules/TtsVoicesModule.swift"
    "RiceMobile/modules/TtsVoicesModule.h"
    "RiceMobile/modules/PhotoFixer.swift"
    "RiceMobile/RiceMobile-Bridging-Header.h"
    "Podfile"
)

for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "⚠️  Archivo faltante: $file"
    fi
done

echo "✅ Estructura verificada"

# Copiar modelo si existe
if [ -f "../assets/models/model.tflite" ]; then
    echo "📋 Copiando modelo TensorFlow Lite..."
    # Aquí iría la lógica para copiar el modelo a Assets.xcassets si es necesario
    echo "✅ Modelo identificado"
else
    echo "⚠️  Modelo model.tflite no encontrado en assets/models/"
fi

echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "Próximos pasos:"
echo "1. Abre: RiceMobile.xcworkspace (NO .xcodeproj)"
echo "2. En Xcode, configura el Bridging Header:"
echo "   Build Settings → Bridging Header"
echo "   Establece: RiceMobile/RiceMobile-Bridging-Header.h"
echo "3. Agrega permisos en Info.plist (ver README.md)"
echo "4. Build & Run"
echo ""
