package com.anonymous.myapp

import android.content.Context
import android.graphics.Bitmap
import android.graphics.RectF
import com.google.mediapipe.framework.image.BitmapImageBuilder

import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetectorResult
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector as MPObjectDetector
import com.google.mediapipe.tasks.core.BaseOptions as MPBaseOptions
import com.google.mediapipe.tasks.components.containers.Detection as MPDetection

const val MODEL_PATH = "model.tflite"

enum class ProcessingFramework {
    MEDIAPIPE
}

data class Label(
    val text: String,
    val confidence: Float
)

data class Point(
    val x: Int,
    val y: Int
)

data class Frame(
    val origin: Point,
    val size: Point
)

data class DetectionData(
    val frame: Frame,
    val labels: List<Label>
)

/**
 * Estructura tipica de un resultado de deteccion: DetectionData
 * detection:DetectionData = {
 *      frame: Frame{
 *          origin: Point{x: 10, y: 20},
 *          size: Point{x: 30, y: 40}
 *      },
 *      labels: List<Label>{
 *          Label{text: "label1", confidence: 0.8},
 *          Label{text: "label2", confidence: 0.6}
 *      }
 * }
 */


class ObjectDetection {
    companion object {
        lateinit var processingFramework: ProcessingFramework
        var detector: Any? = null
    }

    fun setupObjectDetector(context: Context, maxResults: Int, scoreThreshold: Float, processingFramework: ProcessingFramework = ProcessingFramework.MEDIAPIPE, modelPath: String = MODEL_PATH) {
        ObjectDetection.processingFramework = processingFramework
        setupMPObjectDetector(context, maxResults, scoreThreshold, modelPath)
    }

    private fun setupMPObjectDetector(context: Context, maxResults: Int, scoreThreshold: Float, modelPath:String) {
        val baseOptionsBuilder = MPBaseOptions.builder()
            .setModelAssetPath(modelPath) // modelo en src/main/assets

        val optionsBuilder = MPObjectDetector.ObjectDetectorOptions.builder()
            .setBaseOptions(baseOptionsBuilder.build())
            .setScoreThreshold(scoreThreshold) // Confianza mínima
            .setMaxResults(maxResults) //Numero maximo de detecciones
            .setRunningMode(RunningMode.IMAGE)


        try {
            ObjectDetection.detector = MPObjectDetector.createFromOptions(context, optionsBuilder.build())
        } catch (e: IllegalStateException) {
            println("Error al cargar el modelo: ${e.message}")
        }
    }

    fun runObjectDetection(bitmap: Bitmap): List<DetectionData> {
        if (ObjectDetection.detector == null) {
            return emptyList()
        }
        // Tanto TensorFLow como MediaPipe usan su propio contenedor de imagen
        lateinit var results: Any //* ObjectDetectorResult
        if(ObjectDetection.processingFramework == ProcessingFramework.MEDIAPIPE){
            val image = BitmapImageBuilder(bitmap).build()
            results = (ObjectDetection.detector as MPObjectDetector).detect(image)
        }

        return processResults(results)
    }

    private fun processResults(result: Any): List<DetectionData> {
        val resultsList = (result as ObjectDetectorResult).detections()

        lateinit var box: RectF
        lateinit var labels: List<Label>
        return resultsList.map { detection ->
            if(processingFramework == ProcessingFramework.MEDIAPIPE) {
                val detection = detection as MPDetection
                box = detection.boundingBox()
                labels = detection.categories().map { category ->
                    Label(category.categoryName(), category.score())
                }
            }

            val frame = Frame(
                Point(box.left.toInt(), box.top.toInt()),
                Point(box.width().toInt(), box.height().toInt())
            )

            DetectionData(frame, labels)
        }
    }
}