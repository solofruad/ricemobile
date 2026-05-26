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

import org.tensorflow.lite.support.image.TensorImage
import org.tensorflow.lite.task.vision.detector.ObjectDetector as TFObjectDetector
import org.tensorflow.lite.task.core.BaseOptions as TFBaseOptions
import org.tensorflow.lite.task.vision.detector.Detection as TFDetection

const val MODEL_PATH = "model.tflite"

enum class ProcessingFramework {
    MEDIAPIPE,
    TENSORFLOW
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
        when (processingFramework) {
            ProcessingFramework.MEDIAPIPE -> setupMPObjectDetector(context, maxResults, scoreThreshold, modelPath)
            ProcessingFramework.TENSORFLOW -> setupTFObjectDetector(context, maxResults, scoreThreshold,modelPath)
        }
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

    private fun setupTFObjectDetector(context: Context, maxResults: Int, scoreThreshold: Float, modelPath:String) {
        val threads = Runtime.getRuntime().availableProcessors()
        var usedThreads = (threads/2).toInt() // Usar la mitad de los núcleos disponibles para no saturar el dispositivo
        if(usedThreads == 0) usedThreads = 1 // Asegurar al menos 1 hilo

        val baseOptionsBuilder = TFBaseOptions.builder()
            .setNumThreads(usedThreads)

        // Configuracion del detector de objetos
        val options = TFObjectDetector.ObjectDetectorOptions.builder()
            .setBaseOptions(baseOptionsBuilder.build())
            .setMaxResults(maxResults)
            .setScoreThreshold(scoreThreshold)
            .build()

        try{
            ObjectDetection.detector = TFObjectDetector.createFromFileAndOptions(
                context,
                modelPath,
                options
            )
        } catch (e: Exception) {
            println("Error al cargar el modelo: ${e.message}")
        }
    }

    fun runObjectDetection(bitmap: Bitmap): List<DetectionData> {
        if (ObjectDetection.detector == null) {
            return emptyList()
        }
        // Tanto TensorFLow como MediaPipe usan su propio contenedor de imagen
        lateinit var results: Any //* List<TFDetection>|ObjectDetectorResult
        if(ObjectDetection.processingFramework == ProcessingFramework.MEDIAPIPE){
            val image = BitmapImageBuilder(bitmap).build()
            results = (ObjectDetection.detector as MPObjectDetector).detect(image)
        }

        if(ObjectDetection.processingFramework == ProcessingFramework.TENSORFLOW) {
            val image = TensorImage.fromBitmap(bitmap)
            results = (ObjectDetection.detector as TFObjectDetector).detect(image)
        }

        return processResults(results)
    }

    private fun processResults(result: Any): List<DetectionData> {
        val resultsList = when (processingFramework) {
            ProcessingFramework.MEDIAPIPE -> (result as ObjectDetectorResult).detections()
            ProcessingFramework.TENSORFLOW -> (result as List<TFDetection>)
        }

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
            if(processingFramework == ProcessingFramework.TENSORFLOW) {
                val detection = detection as TFDetection
                box = detection.boundingBox
                labels = detection.categories.map { category ->
                    Label(category.label, category.score)
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