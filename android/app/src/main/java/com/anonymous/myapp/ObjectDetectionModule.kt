package com.anonymous.myapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.*
import java.io.InputStream


class ObjectDetectionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    // Nombre del modulo en JS: NativeModules.ObjectDetectionModule
    override fun getName(): String = "ObjectDetectionModule"

    private fun resolveFramework(preset: String?): ProcessingFramework {
        if (preset.isNullOrBlank()) return ObjectDetection.defaultFramework()
        return when (preset.trim().lowercase()) {
            "mediapipe-legacy", "mediapipe", "legacy" -> ProcessingFramework.MEDIAPIPE
            "litert", "litert-rice2", "rice2", "litert-nuevo", "nuevo" -> ProcessingFramework.LITERT
            else -> ObjectDetection.defaultFramework()
        }
    }

    @ReactMethod
    fun initializeDetector(maxResults: Int, scoreThreshold: Float, preset: String?, modelPath: String?, promise: Promise) {
        try {
            val framework = resolveFramework(preset)
            val effectiveModelPath = modelPath ?: ""
            Log.i("ObjectDetectionModule", "initializeDetector preset='$preset' framework=$framework model='$effectiveModelPath' maxResults=$maxResults score=$scoreThreshold")
            ObjectDetection().setupObjectDetector(
                reactApplicationContext,
                maxResults,
                scoreThreshold,
                framework,
                effectiveModelPath
            )
            if (ObjectDetection.detector == null) {
                promise.reject("INITIALIZATION_ERROR", "No se pudo cargar el modelo para $framework.")
                return
            }
            promise.resolve(null) // Resolviendo sin datos, solo indicando éxito
        } catch (e: Exception) {
            promise.reject("INITIALIZATION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun closeDetector(promise: Promise) {
        try {
            ObjectDetection.closeDetector()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CLOSE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun detectObjects(imageUri: String, promise: Promise) {
        val currentDetector = ObjectDetection.detector
        if (currentDetector == null) {
            promise.reject("DETECTOR_NOT_INITIALIZED", "El detector no ha sido inicializado. Llama a initializeDetector primero.")
            return
        }
        try {
            // Cargar imagen usando uri suministrada
            println("Detecting objects in image: $imageUri");
            val bitmap = PhotoFixer.generateBitmapFromURI(reactApplicationContext,imageUri)

            val detectionResults = ObjectDetection().runObjectDetection(bitmap)
            bitmap.recycle()

            val result = Arguments.createArray()
            for (detection in detectionResults) {
                val detectionMap = Arguments.createMap()

                val frameMap = Arguments.createMap()

                val originMap = Arguments.createMap()
                originMap.putInt("x", detection.frame.origin.x)
                originMap.putInt("y", detection.frame.origin.y)
                frameMap.putMap("origin", originMap)

                val sizeMap = Arguments.createMap()
                sizeMap.putInt("x", detection.frame.size.x)
                sizeMap.putInt("y", detection.frame.size.y)
                frameMap.putMap("size", sizeMap)

                detectionMap.putMap("frame", frameMap)

                val labelsArray = Arguments.createArray()
                for (label in detection.labels) {
                    val labelMap = Arguments.createMap()
                    labelMap.putString("text", label.text)
                    labelMap.putDouble("confidence", label.confidence.toDouble())
                    labelsArray.pushMap(labelMap)
                }
                detectionMap.putArray("labels", labelsArray)

                result.pushMap(detectionMap)
            }

            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject("DETECTION_ERROR", e.message, e)
        }
    }
}
