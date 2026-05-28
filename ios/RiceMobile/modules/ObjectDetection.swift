import Foundation
import UIKit
import TensorFlowLite
import CoreImage

// MARK: - Data Models

struct Point {
    let x: Int
    let y: Int
}

struct Frame {
    let origin: Point
    let size: Point
}

struct Label {
    let text: String
    let confidence: Float
}

struct DetectionData {
    let frame: Frame
    let labels: [Label]
}

// MARK: - ObjectDetection Class

class ObjectDetection {
    static var interpreter: Interpreter?
    
    private let modelPath: String
    private var maxResults: Int = 10
    private var scoreThreshold: Float = 0.5
    
    init(modelPath: String = "model") {
        self.modelPath = modelPath
    }
    
    // MARK: - Setup
    
    func setupObjectDetector(maxResults: Int, scoreThreshold: Float) throws {
        self.maxResults = maxResults
        self.scoreThreshold = scoreThreshold
        
        guard let modelPath = Bundle.main.path(forResource: modelPath, ofType: "tflite") else {
            throw NSError(domain: "ObjectDetection", code: -1, userInfo: [NSLocalizedDescriptionKey: "Modelo no encontrado: \(modelPath).tflite"])
        }
        
        do {
            ObjectDetection.interpreter = try Interpreter(modelPath: modelPath)
            try ObjectDetection.interpreter?.allocateTensors()
            print("Modelo TensorFlow Lite cargado exitosamente desde: \(modelPath)")
        } catch let error {
            throw NSError(domain: "ObjectDetection", code: -2, userInfo: [NSLocalizedDescriptionKey: "Error al cargar el modelo: \(error.localizedDescription)"])
        }
    }
    
    // MARK: - Detection
    
    func detectObjects(bitmap: UIImage) throws -> [DetectionData] {
        guard let interpreter = ObjectDetection.interpreter else {
            throw NSError(domain: "ObjectDetection", code: -3, userInfo: [NSLocalizedDescriptionKey: "El detector no ha sido inicializado. Llama a setupObjectDetector primero."])
        }
        
        // Preparar la imagen
        let inputData = try prepareImageData(bitmap)
        
        // Detectar
        try interpreter.copy(inputData, toInputAt: 0)
        try interpreter.invoke()
        
        // Procesar resultados
        return try processDetectionResults(interpreter: interpreter)
    }
    
    // MARK: - Private Methods
    
    private func prepareImageData(_ image: UIImage) throws -> Data {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "ObjectDetection", code: -4, userInfo: [NSLocalizedDescriptionKey: "No se pudo procesar la imagen"])
        }
        
        let imageWidth = Int32(cgImage.width)
        let imageHeight = Int32(cgImage.height)
        
        // Redimensionar a 300x300 (tamaño estándar de entrada para detección de objetos)
        let targetSize = CGSize(width: 300, height: 300)
        let scaledImage = resizeImage(image, to: targetSize)
        
        guard let pixelBuffer = createPixelBuffer(from: scaledImage) else {
            throw NSError(domain: "ObjectDetection", code: -5, userInfo: [NSLocalizedDescriptionKey: "No se pudo crear el buffer de píxeles"])
        }
        
        // Convertir a datos normalizados
        return try convertPixelBufferToData(pixelBuffer)
    }
    
    private func resizeImage(_ image: UIImage, to size: CGSize) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }
    
    private func createPixelBuffer(from image: UIImage) -> CVPixelBuffer? {
        guard let cgImage = image.cgImage else { return nil }
        
        let width = cgImage.width
        let height = cgImage.height
        
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            width,
            height,
            kCVPixelFormatType_32BGRA,
            nil,
            &pixelBuffer
        )
        
        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            return nil
        }
        
        CVPixelBufferLockBaseAddress(buffer, .readAndWrite)
        defer { CVPixelBufferUnlockBaseAddress(buffer, .readAndWrite) }
        
        let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)
        let data = CVPixelBufferGetBaseAddress(buffer)
        let rgbColorSpace = CGColorSpaceCreateDeviceRGB()
        let context = CGContext(
            data: data,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: rgbColorSpace,
            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
        )
        
        guard let context = context else { return nil }
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        
        return buffer
    }
    
    private func convertPixelBufferToData(_ pixelBuffer: CVPixelBuffer) throws -> Data {
        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }
        
        guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else {
            throw NSError(domain: "ObjectDetection", code: -6, userInfo: [NSLocalizedDescriptionKey: "No se pudo acceder al buffer"])
        }
        
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
        
        var inputData = Data()
        
        for y in 0..<height {
            let row = baseAddress.advanced(by: y * bytesPerRow).assumingMemoryBound(to: UInt8.self)
            for x in 0..<width {
                let pixelOffset = x * 4
                let b = Float32(row[pixelOffset]) / 255.0
                let g = Float32(row[pixelOffset + 1]) / 255.0
                let r = Float32(row[pixelOffset + 2]) / 255.0
                
                // Agregar en orden RGB normalizado
                inputData.append(contentsOf: withUnsafeBytes(of: r) { Data($0) })
                inputData.append(contentsOf: withUnsafeBytes(of: g) { Data($0) })
                inputData.append(contentsOf: withUnsafeBytes(of: b) { Data($0) })
            }
        }
        
        return inputData
    }
    
    private func processDetectionResults(interpreter: Interpreter) throws -> [DetectionData] {
        var detections: [DetectionData] = []
        
        // Obtener los tensores de salida
        let outputTensor0 = try interpreter.output(at: 0)
        let outputTensor1 = try interpreter.output(at: 1)
        let outputTensor2 = try interpreter.output(at: 2)
        let outputTensor3 = try interpreter.output(at: 3)
        
        // Interpretar datos de salida según la estructura del modelo
        // Esta es una implementación genérica que puede necesitar ajustes según tu modelo específico
        
        if let boxData = outputTensor0.data,
           let classData = outputTensor1.data,
           let scoresData = outputTensor2.data,
           let numDetectionsData = outputTensor3.data {
            
            let numDetections = min(Int(UnsafeRawBufferPointer(start: numDetectionsData.baseAddress?.assumingMemoryBound(to: Float32.self), count: 1).first ?? 0.0), maxResults)
            
            let boxes = UnsafeRawBufferPointer(start: boxData.baseAddress?.assumingMemoryBound(to: Float32.self), count: boxData.count / MemoryLayout<Float32>.size)
            let classes = UnsafeRawBufferPointer(start: classData.baseAddress?.assumingMemoryBound(to: Float32.self), count: classData.count / MemoryLayout<Float32>.size)
            let scores = UnsafeRawBufferPointer(start: scoresData.baseAddress?.assumingMemoryBound(to: Float32.self), count: scoresData.count / MemoryLayout<Float32>.size)
            
            for i in 0..<numDetections {
                guard scores[i] >= scoreThreshold else { continue }
                
                let top = Int(boxes[i * 4] * 300)
                let left = Int(boxes[i * 4 + 1] * 300)
                let bottom = Int(boxes[i * 4 + 2] * 300)
                let right = Int(boxes[i * 4 + 3] * 300)
                
                let frame = Frame(
                    origin: Point(x: left, y: top),
                    size: Point(x: right - left, y: bottom - top)
                )
                
                let label = Label(
                    text: "Object \(Int(classes[i]))",
                    confidence: scores[i]
                )
                
                let detection = DetectionData(frame: frame, labels: [label])
                detections.append(detection)
            }
        }
        
        return detections
    }
}
