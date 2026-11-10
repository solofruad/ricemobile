# Pod local con los modulos nativos custom de RiceMobile para iOS:
#   - ObjectDetectionModule  -> deteccion de objetos con TensorFlowLiteSwift:
#       * model.tflite (legacy, SSD con TFLite_Detection_PostProcess embebido
#         + etiquetas en model_labels.txt)
#       * rice2.tflite (YOLO [1,8,8400] + NMS manual porteado de Android:
#         mismos umbrales, clases y postproceso)
#     En Android el legacy corre con MediaPipe; en iOS NO se puede: el pod
#     MediaPipeTasksVision trae su propia copia del runtime de TFLite y al
#     enlazarlo junto a TensorFlowLiteC da 54 simbolos duplicados (_TfLite*).
#   - TtsVoicesModule        -> sintesis de voz con AVSpeechSynthesizer
#   - CameraFocusInfoModule  -> distancia minima de enfoque con AVFoundation
#
# Vive en la RAIZ del repo (no dentro de ios/) para que `expo prebuild --clean`
# nunca lo borre. El plugin plugins/with-ricenative.js lo referencia en el
# Podfile como:  pod 'RiceNative', :path => '../RiceNative'

Pod::Spec.new do |s|
  s.name             = 'RiceNative'
  s.version          = '0.1.0'
  s.summary          = 'Modulos nativos custom de RiceMobile para iOS'
  s.license          = { :type => 'MIT' }
  s.homepage         = 'https://github.com/solofruad/ricemobile'
  s.author           = { 'RiceMobile' => 'dev@ricemobile.local' }
  s.source           = { :path => '.' }

  s.platforms        = { :ios => '15.1' }
  s.swift_version    = '5.0'
  s.static_framework = true

  s.source_files     = 'Sources/**/*.{swift,h,m}'

  # Dependencias de React Native (React-Core: RCTBridgeModule, RCTPromiseResolveBlock, etc.)
  install_modules_dependencies(s)

  # Runtime CPU para ambos modelos (legacy y rice2).
  # Misma generacion que Android (org.tensorflow:tensorflow-lite:2.17.0).
  # No agregar MediaPipeTasksVision: ver la nota de simbolos duplicados arriba.
  s.dependency 'TensorFlowLiteSwift', '~> 2.17.0'
end
