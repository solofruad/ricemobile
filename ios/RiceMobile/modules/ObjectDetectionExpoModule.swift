// ios/RiceMobile/RCTObjectDetectionModule.swift
// Archivo alternativo si preferiblemente usar Expo en lugar de módulos directos de React Native

import Foundation
import ExpoModulesCore

public class ObjectDetectionModule: Module {
    
    public func definition() -> ModuleDefinition {
        Name("ObjectDetection")
        
        AsyncFunction("initializeDetector") { (maxResults: Int, scoreThreshold: Float, promise: Promise) in
            do {
                try ObjectDetection().setupObjectDetector(maxResults: maxResults, scoreThreshold: scoreThreshold)
                promise.resolve(NSNull())
            } catch {
                promise.reject(error)
            }
        }
        
        AsyncFunction("detectObjects") { (imageUri: String, promise: Promise) in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let image = try PhotoFixer.generateUIImage(fromURI: imageUri)
                    let detections = try ObjectDetection().detectObjects(bitmap: image)
                    
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
                        promise.resolve(result)
                    }
                } catch {
                    promise.reject(error)
                }
            }
        }
    }
}
