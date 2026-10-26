import Foundation
import MediaPipeTasksVision
import React
import TensorFlowLite
import UIKit

/// Equivalente iOS de ObjectDetection.kt (dual framework MEDIAPIPE | LITERT).
///
/// Interfaz expuesta a JavaScript (identica a la de Android):
///   initializeDetector(maxResults, scoreThreshold, preset, modelPath) -> Promise<null>
///   closeDetector() -> Promise<null>
///   detectObjects(imageUri) -> Promise<Array<{
///     frame: { origin: {x, y}, size: {x, y} },
///     labels: [{ text, confidence }]
///   }>>
///
/// preset: "mediapipe-legacy" (model.tflite + NMS embebido) o "litert"
/// (rice2.tflite YOLO [1,8,8400] + NMS manual). Se aceptan los mismos alias
/// que en Android. null/vacio => default nativo (LITERT).
/// modelPath: nombre del recurso en el bundle (con o sin extension .tflite);
/// vacio/nil => default del framework activo.
@objc(ObjectDetectionModule)
final class ObjectDetectionModule: NSObject {

  // MARK: - Constantes (espejo de ObjectDetection.kt en Android)

  private static let legacyModelName = "model" // model.tflite
  private static let litertModelName = "rice2" // rice2.tflite

  private static let litertInputSize = 640
  private static let litertNumAnchors = 8400
  private static let litertNumAttrs = 8 // 4 box (cx,cy,w,h) + 4 clases
  private static let litertNumClasses = 4
  private static let litertDefaultConfThreshold: Float = 0.1
  private static let litertIouThreshold: Float = 0.45
  private static let litertNumThreads = 4

  private static let litertClassNames = [
    "Rynchosporium", // 0
    "Pyricularia",   // 1
    "Lepidoptera",   // 2
    "Cercospora",    // 3
  ]

  private enum ProcessingFramework {
    case mediapipe
    case litert
  }

  private struct RawCandidate {
    var minX: Float
    var minY: Float
    var maxX: Float
    var maxY: Float
    var classId: Int
    var score: Float
  }

  private static let detectionQueue = DispatchQueue(
    label: "ricenative.objectdetection",
    qos: .userInitiated
  )
  private static var framework: ProcessingFramework = .litert
  private static var mpDetector: ObjectDetector?
  private static var litertInterpreter: Interpreter?
  private static var litertMaxResults = 25
  private static var litertConfThreshold: Float = litertDefaultConfThreshold

  @objc static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Inicializacion

  @objc(initializeDetector:scoreThreshold:preset:modelPath:resolver:rejecter:)
  func initializeDetector(_ maxResults: Int,
                          scoreThreshold: Float,
                          preset: String?,
                          modelPath: String?,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    Self.closeDetectors()
    let framework = Self.resolveFramework(preset)
    Self.framework = framework
    do {
      switch framework {
      case .mediapipe:
        try Self.setupMediapipe(maxResults: maxResults,
                               scoreThreshold: scoreThreshold,
                               modelPath: modelPath)
      case .litert:
        try Self.setupLitert(maxResults: maxResults,
                             scoreThreshold: scoreThreshold,
                             modelPath: modelPath)
      }
      resolve(nil)
    } catch {
      Self.closeDetectors()
      reject("INITIALIZATION_ERROR", error.localizedDescription, error)
    }
  }

  @objc(closeDetector:rejecter:)
  func closeDetector(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    Self.closeDetectors()
    resolve(nil)
  }

  private static func resolveFramework(_ preset: String?) -> ProcessingFramework {
    guard let raw = preset?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
      return .litert // default nativo (USE_LITERT_BY_DEFAULT = true en Android)
    }
    switch raw.lowercased() {
    case "mediapipe-legacy", "mediapipe", "legacy":
      return .mediapipe
    case "litert", "litert-rice2", "rice2", "litert-nuevo", "nuevo":
      return .litert
    default:
      return .litert
    }
  }

  /// Nombre del recurso en el bundle a partir del modelPath opcional de JS
  /// (acepta "rice2" o "rice2.tflite") o el default del framework.
  private static func bundleModelPath(resourceDefault: String, modelPath: String?) throws -> String {
    var name = resourceDefault
    if let custom = modelPath?.trimmingCharacters(in: .whitespacesAndNewlines), !custom.isEmpty {
      name = custom.hasSuffix(".tflite") ? String(custom.dropLast(".tflite".count)) : custom
    }
    guard let fullPath = Bundle.main.path(forResource: name, ofType: "tflite") else {
      throw riceError(1, "No se encontro \(name).tflite en el bundle de la app")
    }
    return fullPath
  }

  private static func setupMediapipe(maxResults: Int, scoreThreshold: Float, modelPath: String?) throws {
    let fullPath = try bundleModelPath(resourceDefault: legacyModelName, modelPath: modelPath)

    let baseOptions = BaseOptions()
    baseOptions.modelAssetPath = fullPath

    let options = ObjectDetectorOptions()
    options.baseOptions = baseOptions
    options.runningMode = .image
    options.maxResults = maxResults
    options.scoreThreshold = scoreThreshold

    mpDetector = try ObjectDetector(options: options)
  }

  private static func setupLitert(maxResults: Int, scoreThreshold: Float, modelPath: String?) throws {
    litertMaxResults = maxResults
    // Si el llamador pasa un umbral valido se respeta; si no, CONF_THRESHOLD (igual que Android).
    litertConfThreshold = (scoreThreshold >= 0 && scoreThreshold < 1)
      ? scoreThreshold
      : litertDefaultConfThreshold

    let fullPath = try bundleModelPath(resourceDefault: litertModelName, modelPath: modelPath)
    var options = Interpreter.Options()
    options.threadCount = litertNumThreads
    let interpreter = try Interpreter(modelPath: fullPath, options: options)
    try interpreter.allocateTensors()
    // Log defensivo de shapes reales (igual que Android).
    do {
      let inShape = try interpreter.input(at: 0).shape.dimensions
      let outShape = try interpreter.output(at: 0).shape.dimensions
      NSLog("[ObjectDetection] LiteRT modelo '%@' input=%@ output=%@",
            (fullPath as NSString).lastPathComponent,
            "\(inShape)", "\(outShape)")
    } catch {
      NSLog("[ObjectDetection] No se pudo inspeccionar tensores: %@", "\(error)")
    }
    litertInterpreter = interpreter
  }

  private static func closeDetectors() {
    mpDetector = nil
    litertInterpreter = nil
  }

  // MARK: - Deteccion

  @objc(detectObjects:resolver:rejecter:)
  func detectObjects(_ imageUri: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    let framework = Self.framework
    let hasDetector: Bool = {
      switch framework {
      case .mediapipe: return Self.mpDetector != nil
      case .litert: return Self.litertInterpreter != nil
      }
    }()
    guard hasDetector else {
      reject(
        "DETECTOR_NOT_INITIALIZED",
        "El detector no ha sido inicializado. Llama a initializeDetector primero.",
        nil
      )
      return
    }

    ObjectDetectionModule.detectionQueue.async {
      do {
        let uiImage = try Self.loadImageIgnoringExif(from: imageUri)
        let payload: [[String: Any]]
        switch framework {
        case .mediapipe:
          guard let detector = Self.mpDetector else {
            throw Self.riceError(2, "El detector se libero durante la deteccion")
          }
          let mpImage = try MPImage(uiImage: uiImage)
          let result = try detector.detect(image: mpImage)
          payload = Self.toJsPayload(result,
                                     imageWidth: uiImage.cgImage?.width ?? 0,
                                     imageHeight: uiImage.cgImage?.height ?? 0)
        case .litert:
          guard let interpreter = Self.litertInterpreter else {
            throw Self.riceError(2, "El detector se libero durante la deteccion")
          }
          payload = try Self.runLitertDetection(interpreter: interpreter, image: uiImage)
        }
        resolve(payload)
      } catch {
        reject("DETECTION_ERROR", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Camino MediaPipe

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
  /// Incluye el clamping a bordes + descarte de cajas degeneradas de Android
  /// (processResults), ausente en la primera version iOS.
  private static func toJsPayload(_ result: ObjectDetectorResult,
                                 imageWidth: Int,
                                 imageHeight: Int) -> [[String: Any]] {
    var payload: [[String: Any]] = []
    payload.reserveCapacity(result.detections.count)
    for detection in result.detections {
      let box = detection.boundingBox
      let left = min(max(box.minX, 0), CGFloat(imageWidth))
      let top = min(max(box.minY, 0), CGFloat(imageHeight))
      let right = min(max(box.maxX, 0), CGFloat(imageWidth))
      let bottom = min(max(box.maxY, 0), CGFloat(imageHeight))
      let width = right - left
      let height = bottom - top
      if width < 1 || height < 1 { continue }

      let frame: [String: Any] = [
        "origin": ["x": Int(left), "y": Int(top)],
        "size": ["x": Int(width), "y": Int(height)]
      ]
      var labels: [[String: Any]] = []
      for category in detection.categories {
        labels.append([
          "text": category.categoryName ?? "",
          "confidence": Double(category.score)
        ])
      }
      payload.append(["frame": frame, "labels": labels])
    }
    return payload
  }

  // MARK: - Camino LiteRT (YOLO [1,8,8400] + NMS manual, espejo de Android)

  private static func runLitertDetection(interpreter: Interpreter,
                                        image: UIImage) throws -> [[String: Any]] {
    guard let cgImage = image.cgImage else {
      throw riceError(7, "La imagen no tiene representacion CGImage")
    }
    let origW = cgImage.width
    let origH = cgImage.height
    guard origW > 0, origH > 0 else {
      throw riceError(4, "La imagen tiene dimensiones invalidas: \(origW)x\(origH)")
    }

    let inputShape = try interpreter.input(at: 0).shape.dimensions
    let useNCHW = !isNHWCShape(inputShape)
    let floats = try scaledFloatInput(from: cgImage, nchw: useNCHW)
    var inputData = Data(capacity: floats.count * 4)
    floats.withUnsafeBytes { inputData.append($0.bindMemory(to: UInt8.self)) }

    try interpreter.copy(inputData, toInputAt: 0)
    try interpreter.invoke()
    let output = try interpreter.output(at: 0)
    guard output.dataType == .float32 else {
      throw riceError(8, "Tipo de salida no soportado: \(output.dataType)")
    }
    let flat: [Float] = output.data.withUnsafeBytes { Array($0.bindMemory(to: Float.self)) }
    let grid = try normalizeOutput(flat: flat, shape: output.shape.dimensions)
    return decodeAndNms(output8x8400: grid, origW: origW, origH: origH)
  }

  /// Heuristica identica a Android (isNCHWInput): solo [1,640,640,3] se trata
  /// como NHWC; cualquier otra forma (incluido [1,3,640,640]) va como NCHW.
  private static func isNHWCShape(_ shape: [Int]) -> Bool {
    return shape.count == 4 && shape[0] == 1 && shape[1] == litertInputSize
      && shape[2] == litertInputSize && shape[3] == 3
  }

  /// Resize stretch a 640x640 + normalizacion RGB 0..1 (igual que Android:
  /// createScaledBitmap sin letterbox + getPixels/255).
  private static func scaledFloatInput(from cgImage: CGImage, nchw: Bool) throws -> [Float] {
    let size = litertInputSize
    guard let context = CGContext(
      data: nil,
      width: size,
      height: size,
      bitsPerComponent: 8,
      bytesPerRow: size * 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    ) else {
      throw riceError(5, "No se pudo crear el contexto RGB para el resize 640x640")
    }
    context.interpolationQuality = .default
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: size, height: size))
    guard let data = context.data else {
      throw riceError(6, "No se pudieron leer los pixeles reescalados")
    }
    let bytes = data.bindMemory(to: UInt8.self, capacity: size * size * 4)
    var floats = [Float](repeating: 0, count: size * size * 3)
    if nchw {
      // Orden NCHW: primero todo R, luego G, luego B.
      var idxR = 0
      var idxG = size * size
      var idxB = 2 * size * size
      for i in 0 ..< (size * size) {
        floats[idxR] = Float(bytes[i * 4]) / 255.0
        floats[idxG] = Float(bytes[i * 4 + 1]) / 255.0
        floats[idxB] = Float(bytes[i * 4 + 2]) / 255.0
        idxR += 1
        idxG += 1
        idxB += 1
      }
    } else {
      for i in 0 ..< (size * size) {
        floats[i * 3] = Float(bytes[i * 4]) / 255.0
        floats[i * 3 + 1] = Float(bytes[i * 4 + 1]) / 255.0
        floats[i * 3 + 2] = Float(bytes[i * 4 + 2]) / 255.0
      }
    }
    return floats
  }

  /// Normaliza la salida a la vista [8][8400] tolerando los dos layouts:
  /// [1,8,8400] (canal-primero) y [1,8400,8] (ancla-primero, se traspone).
  private static func normalizeOutput(flat: [Float], shape: [Int]) throws -> [[Float]] {
    let expected = litertNumAttrs * litertNumAnchors
    guard flat.count == expected else {
      throw riceError(8, "Forma de salida no soportada: \(shape) (\(flat.count) valores)")
    }
    if shape.count == 3 && shape[0] == 1
      && shape[1] == litertNumAttrs && shape[2] == litertNumAnchors {
      // [1,8,8400] directo.
      return (0 ..< litertNumAttrs).map { a in
        Array(flat[(a * litertNumAnchors) ..< ((a + 1) * litertNumAnchors)])
      }
    }
    if shape.count == 3 && shape[0] == 1
      && shape[1] == litertNumAnchors && shape[2] == litertNumAttrs {
      // [1,8400,8] -> trasponer a [8][8400].
      var grid = [[Float]](repeating: [Float](repeating: 0, count: litertNumAnchors),
                           count: litertNumAttrs)
      for i in 0 ..< litertNumAnchors {
        for a in 0 ..< litertNumAttrs {
          grid[a][i] = flat[i * litertNumAttrs + a]
        }
      }
      return grid
    }
    throw riceError(8, "Forma de salida no soportada: \(shape)")
  }

  private static func decodeAndNms(output8x8400 grid: [[Float]],
                                  origW: Int,
                                  origH: Int) -> [[String: Any]] {
    let confThresh = litertConfThreshold
    let scaleX = Float(origW) / Float(litertInputSize)
    let scaleY = Float(origH) / Float(litertInputSize)
    var candidates: [RawCandidate] = []
    candidates.reserveCapacity(256)

    for i in 0 ..< litertNumAnchors {
      var cx = grid[0][i]
      var cy = grid[1][i]
      var w = grid[2][i]
      var h = grid[3][i]

      // Tolerancia: si el modelo entrega coords normalizadas 0..1, llevar a 0..640.
      if cx <= 1.5 && cy <= 1.5 && w <= 1.5 && h <= 1.5 && w >= 0 && h >= 0 {
        cx *= Float(litertInputSize)
        cy *= Float(litertInputSize)
        w *= Float(litertInputSize)
        h *= Float(litertInputSize)
      }
      if w <= 0 || h <= 0 { continue }

      // argmax entre las 4 clases (indices 4..7).
      var bestId = 0
      var bestScore = grid[4][i]
      for k in 1 ..< litertNumClasses {
        let s = grid[4 + k][i]
        if s > bestScore {
          bestScore = s
          bestId = k
        }
      }
      if bestScore < confThresh { continue }

      // cxcywh (640) -> esquinas (640) -> esquinas (original), con clamping
      // estilo ricemobile igual que Android.
      let left = min(max((cx - w / 2) * scaleX, 0), Float(origW))
      let top = min(max((cy - h / 2) * scaleY, 0), Float(origH))
      let right = min(max((cx + w / 2) * scaleX, 0), Float(origW))
      let bottom = min(max((cy + h / 2) * scaleY, 0), Float(origH))
      let width = max(right - left, 0)
      let height = max(bottom - top, 0)
      if width < 1 || height < 1 { continue }

      candidates.append(RawCandidate(minX: left, minY: top,
                                     maxX: right, maxY: bottom,
                                     classId: bestId, score: bestScore))
    }

    if candidates.isEmpty { return [] }
    let kept = nmsPerClass(candidates, iouThreshold: litertIouThreshold)
    // Top-N global por score, como maxResults de MediaPipe.
    let top = kept.sorted { $0.score > $1.score }.prefix(litertMaxResults)

    return top.map { c -> [String: Any] in
      let labelName = c.classId < litertClassNames.count
        ? litertClassNames[c.classId]
        : "class_\(c.classId)"
      return [
        "frame": [
          "origin": ["x": Int(c.minX), "y": Int(c.minY)],
          "size": ["x": Int(c.maxX - c.minX), "y": Int(c.maxY - c.minY)],
        ],
        "labels": [
          ["text": labelName, "confidence": Double(c.score)],
        ],
      ]
    }
  }

  /// NMS por clase: ordena por score, suprime cajas con IoU > umbral
  /// dentro de la misma clase.
  private static func nmsPerClass(_ candidates: [RawCandidate],
                                 iouThreshold: Float) -> [RawCandidate] {
    var result: [RawCandidate] = []
    result.reserveCapacity(candidates.count)
    let byClass = Dictionary(grouping: candidates) { $0.classId }
    for (_, list) in byClass {
      let sorted = list.sorted { $0.score > $1.score }
      var active = [Bool](repeating: true, count: sorted.count)
      for i in sorted.indices {
        if !active[i] { continue }
        let a = sorted[i]
        result.append(a)
        for j in (i + 1) ..< sorted.count {
          if !active[j] { continue }
          if iou(a, sorted[j]) > iouThreshold {
            active[j] = false
          }
        }
      }
    }
    return result
  }

  private static func iou(_ a: RawCandidate, _ b: RawCandidate) -> Float {
    let interLeft = max(a.minX, b.minX)
    let interTop = max(a.minY, b.minY)
    let interRight = min(a.maxX, b.maxX)
    let interBottom = min(a.maxY, b.maxY)
    let interW = interRight - interLeft
    let interH = interBottom - interTop
    if interW <= 0 || interH <= 0 { return 0 }
    let inter = interW * interH
    let union = (a.maxX - a.minX) * (a.maxY - a.minY)
      + (b.maxX - b.minX) * (b.maxY - b.minY) - inter
    if union <= 0 { return 0 }
    return inter / union
  }

  private static func riceError(_ code: Int, _ message: String) -> NSError {
    NSError(
      domain: "RiceNative",
      code: code,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }
}
