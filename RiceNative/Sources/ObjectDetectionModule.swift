import Foundation
import MediaPipeTasksVision
import React
import UIKit

/// Equivalente iOS de ObjectDetectionModule.kt (Android usa MediaPipe Tasks Vision).
///
/// Interfaz expuesta a JavaScript (identica a la de Android):
///   initializeDetector(maxResults, scoreThreshold) -> Promise<null>
///   detectObjects(imageUri) -> Promise<Array<{
///     frame: { origin: {x, y}, size: {x, y} },
///     labels: [{ text, confidence }]
///   }>>
@objc(ObjectDetectionModule)
final class ObjectDetectionModule: NSObject {

  private static let detectionQueue = DispatchQueue(
    label: "ricenative.objectdetection",
    qos: .userInitiated
  )
  private static var detector: ObjectDetector?

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(initializeDetector:scoreThreshold:resolver:rejecter:)
  func initializeDetector(_ maxResults: Int,
                          scoreThreshold: Float,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    do {
      guard let modelPath = Bundle.main.path(forResource: "model", ofType: "tflite") else {
        throw Self.riceError(1, "No se encontro model.tflite en el bundle de la app")
      }

      let baseOptions = BaseOptions()
      baseOptions.modelAssetPath = modelPath

      let options = ObjectDetectorOptions()
      options.baseOptions = baseOptions
      options.runningMode = .image
      options.maxResults = maxResults
      options.scoreThreshold = scoreThreshold

      ObjectDetectionModule.detector = try ObjectDetector(options: options)
      resolve(nil)
    } catch {
      ObjectDetectionModule.detector = nil
      reject("INITIALIZATION_ERROR", error.localizedDescription, error)
    }
  }

  @objc(detectObjects:resolver:rejecter:)
  func detectObjects(_ imageUri: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard ObjectDetectionModule.detector != nil else {
      reject(
        "DETECTOR_NOT_INITIALIZED",
        "El detector no ha sido inicializado. Llama a initializeDetector primero.",
        nil
      )
      return
    }

    ObjectDetectionModule.detectionQueue.async {
      do {
        guard let detector = ObjectDetectionModule.detector else {
          throw Self.riceError(2, "El detector se libero durante la deteccion")
        }
        let uiImage = try Self.loadImageIgnoringExif(from: imageUri)
        let mpImage = try MPImage(uiImage: uiImage)
        let result = try detector.detect(image: mpImage)
        resolve(Self.toJsPayload(result))
      } catch {
        reject("DETECTION_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Helpers

  /// Carga la imagen desde una ruta o URI file:// y la redibuja en un contexto
  /// RGBA (MediaPipe exige RGB con canal alpha), descartando la rotacion EXIF.
  /// Esto replica el comportamiento de BitmapFactory.decodeStream en Android:
  /// las detecciones quedan en coordenadas de pixeles crudos de la imagen.
  private static func loadImageIgnoringExif(from imageUri: String) throws -> UIImage {
    var path = imageUri
    if path.hasPrefix("file://") {
      path = String(path.dropFirst("file://".count))
    }
    if let decoded = path.removingPercentEncoding {
      path = decoded
    }

    guard let original = UIImage(contentsOfFile: path), let cgImage = original.cgImage else {
      throw riceError(3, "No se pudo cargar la imagen: \(imageUri)")
    }

    let width = cgImage.width
    let height = cgImage.height
    guard width > 0, height > 0 else {
      throw riceError(4, "La imagen tiene dimensiones invalidas: \(width)x\(height)")
    }

    guard let context = CGContext(
      data: nil,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: width * 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
      throw riceError(5, "No se pudo crear el contexto RGBA para la imagen")
    }

    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    guard let rgbaImage = context.makeImage() else {
      throw riceError(6, "No se pudo generar la imagen RGBA")
    }
    return UIImage(cgImage: rgbaImage)
  }

  /// Convierte ObjectDetectorResult al mismo formato JS que produce Android:
  /// frame.origin = esquina superior izquierda, frame.size = ancho/alto del box.
  private static func toJsPayload(_ result: ObjectDetectorResult) -> [[String: Any]] {
    result.detections.map { detection in
      let box = detection.boundingBox
      return [
        "frame": [
          "origin": ["x": Int(box.minX), "y": Int(box.minY)],
          "size": ["x": Int(box.width), "y": Int(box.height)]
        ],
        "labels": detection.categories.map { category in
          [
            "text": category.categoryName ?? "",
            "confidence": Double(category.score)
          ]
        ] as [[String: Any]]
      ] as [String: Any]
    }
  }

  private static func riceError(_ code: Int, _ message: String) -> NSError {
    NSError(
      domain: "RiceNative",
      code: code,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }
}
