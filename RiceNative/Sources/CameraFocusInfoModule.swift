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

    // minFocusDistance esta en dioptrias, igual que LENS_INFO_MINIMUM_FOCUS_DISTANCE
    // en Android. Un valor de 0 indica foco fijo o distancia desconocida.
    let diopters = device.minFocusDistance
    if diopters > 0 {
      resolve(Double(diopters))
    } else {
      resolve(nil)
    }
  }
}
