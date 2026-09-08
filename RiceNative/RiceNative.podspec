# Pod local con los modulos nativos custom de RiceMobile para iOS:
#   - ObjectDetectionModule  -> deteccion de objetos con MediaPipe Tasks Vision (model.tflite)
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

  # MediaPipe Tasks Vision: misma libreria usada en Android (com.google.mediapipe:tasks-vision)
  s.dependency 'MediaPipeTasksVision', '~> 0.10.9'
end
