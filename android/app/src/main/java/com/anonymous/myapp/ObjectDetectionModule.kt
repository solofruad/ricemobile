package com.anonymous.myapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.*
import java.io.InputStream


class ObjectDetectionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    // Nombre del modulo en JS: NativeModules.ObjectDetectionModule
    override fun getName(): String = "ObjectDetectionModule"

    @ReactMethod
    fun initializeDetector(maxResults: Int, scoreThreshold: Float, promise: Promise) {
        try {
            ObjectDetection().setupObjectDetector(
                reactApplicationContext,
                maxResults,
                scoreThreshold
            )
            promise.resolve(null) // Resolviendo sin datos, solo indicando éxito
        } catch (e: Exception) {
            promise.reject("INITIALIZATION_ERROR", e.message, e)
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