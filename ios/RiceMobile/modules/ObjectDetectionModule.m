import React

// Módulo React Native para ObjectDetection
@objc(ObjectDetectionModule)
class ObjectDetectionModule: NSObject {
    
    private static let objectDetection = ObjectDetection()
    
    // MARK: - Module Setup
    
    @objc
    static func moduleName() -> String! {
        return "ObjectDetectionModule"
    }
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    // MARK: - Initialize Detector
    
    @objc
    func initializeDetector(_ maxResults: NSNumber, scoreThreshold: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            try ObjectDetectionModule.objectDetection.setupObjectDetector(
                maxResults: maxResults.intValue,
                scoreThreshold: scoreThreshold.floatValue
            )
            resolve(NSNull())
        } catch let error {
            reject("INITIALIZATION_ERROR", error.localizedDescription, error)
        }
    }
    
    // MARK: - Detect Objects
    
    @objc
    func detectObjects(_ imageUri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                print("Detecting objects in image: \(imageUri)")
                
                // Cargar imagen desde URI
                let image = try PhotoFixer.generateUIImage(fromURI: imageUri)
                
                // Ejecutar detección
                let detections = try ObjectDetectionModule.objectDetection.detectObjects(bitmap: image)
                
                // Convertir resultados al formato JSON esperado
                let result = detections.map { detection -> [String: Any] in
                    let frameDict: [String: Any] = [
                        "origin": [
                            "x": detection.frame.origin.x,
                            "y": detection.frame.origin.y
                        ],
                        "size": [
                            "x": detection.frame.size.x,
                            "y": detection.frame.size.y
                        ]
                    ]
                    
                    let labelsArray = detection.labels.map { label -> [String: Any] in
                        [
                            "text": label.text,
                            "confidence": Double(label.confidence)
                        ]
                    }
                    
                    return [
                        "frame": frameDict,
                        "labels": labelsArray
                    ]
                }
                
                DispatchQueue.main.async {
                    resolve(result)
                }
            } catch let error {
                reject("DETECTION_ERROR", error.localizedDescription, error)
            }
        }
    }
}
