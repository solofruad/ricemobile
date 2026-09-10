import AVFoundation
import Foundation
import React

/// Equivalente iOS del CameraFocusInfoModule que el patch agrega en Android
/// (patches/react-native-vision-camera+5.0.8.patch).
///
/// En iOS react-native-vision-camera ya soporta foco manual (setFocusLocked)
/// de forma nativa, asi que solo hace falta exponer la distancia minima de
/// enfoque para calcular posiciones de lente.
///
/// Interfaz expuesta a JavaScript (identica a la de Android):
///   getMinFocusDistance() -> Promise<number | null>
///     Devuelve dioptrias; null si no hay camara trasera o el foco es fijo.
///
/// Nota: consultar metadatos de AVCaptureDevice NO requiere permiso de camara.
@objc(CameraFocusInfoModule)
final class CameraFocusInfoModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(getMinFocusDistance:rejecter:)
  func getMinFocusDistance(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
      ?? AVCaptureDevice.default(for: .video)

    guard let device = device else {
      resolve(nil)
      return
    }

    // AVCaptureDevice.minimumFocusDistance (iOS 15+) esta en MILIMETROS; -1 si
    // es desconocido. Android devuelve diopters (LENS_INFO_MINIMUM_FOCUS_DISTANCE),
    // asi que convertimos con diopter = 1000 / distancia_en_metros para que la
    // app reciba la misma unidad en ambas plataformas.
    let millimeters = device.minimumFocusDistance
    if millimeters > 0 {
      resolve(Double(1000.0) / Double(millimeters))
    } else {
      resolve(nil)
    }
  }
}
