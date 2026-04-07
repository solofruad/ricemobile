package com.anonymous.myapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.*
import java.io.InputStream
import org.tensorflow.lite.support.image.TensorImage
import org.tensorflow.lite.task.vision.detector.ObjectDetector
import org.tensorflow.lite.task.core.BaseOptions

data class Label(
    val text: String,
    val confidence: Float
)

data class Point(
    val x: Double,
    val y: Double
)

data class Frame(
    val origin: Point,
    val size: Point
)

data class DetectionData(
    val frame: Frame,
    val labels: List<Label>
)

class ObjectDetectionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        var detector: ObjectDetector? = null
    }

    // Nombre del modulo en JS: NativeModules.ObjectDetectionModule
    override fun getName(): String = "ObjectDetectionModule"

    @ReactMethod
    fun initializeDetector(maxResults: Int, scoreThreshold: Float, promise: Promise) {
        try {
            if (ObjectDetectionModule.detector != null) {
                //Reinicializar el detector si ya existe, esto es útil para cambiar parámetros sin reiniciar la app
                ObjectDetectionModule.detector = null
            }

            val threads = Runtime.getRuntime().availableProcessors()

            var usedThreads = (threads/2).toInt() // Usar la mitad de los núcleos disponibles para no saturar el dispositivo 
            if(usedThreads == 0) usedThreads = 1 // Asegurar al menos 1 hilo
            // Configurar numero de hilos para procesamiento (opcional, dependiendo del modelo y dispositivo)
            val baseOptionsBuilder = BaseOptions.builder()
                .setNumThreads(usedThreads) //TODO: Ajusta según el dispositivo

            // Configuracion del detector de objetos
            val options = ObjectDetector.ObjectDetectorOptions.builder()
                .setBaseOptions(baseOptionsBuilder.build())
                .setMaxResults(maxResults)
                .setScoreThreshold(scoreThreshold)
                .build()

            ObjectDetectionModule.detector = ObjectDetector.createFromFileAndOptions(
                reactApplicationContext,
                "model.tflite", // Nombre del modelo que se encuentra en ./assets/models/
                options
            )

            promise.resolve(null) // Resolviendo sin datos, solo indicando éxito
        } catch (e: Exception) {
            promise.reject("INITIALIZATION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun detectObjects(imageUri: String, promise: Promise) {
        val currentDetector = ObjectDetectionModule.detector
        if (currentDetector == null) {
            promise.reject("DETECTOR_NOT_INITIALIZED", "El detector no ha sido inicializado. Llama a initializeDetector primero.")
            return
        }
        try {
            // Cargar imagen usando uri suministrada
            println("Detecting objects in image: $imageUri");
            val uri = Uri.parse(imageUri)
            val inputStream: InputStream? = reactApplicationContext.contentResolver.openInputStream(uri)
            val bitmap = BitmapFactory.decodeStream(inputStream)

            // Procesar imagen
            val image = TensorImage.fromBitmap(bitmap)
            val results = currentDetector.detect(image)

            // 4. Convertir resultados a un formato que React Native entienda (WritableArray)
            val response = Arguments.createArray()

            for (detection in results) {
                val item = Arguments.createMap()

                val labels = Arguments.createArray()                
                for (category in detection.categories) {
                    val label = Arguments.createMap()
                    label.putString("text", category.label)
                    label.putDouble("confidence", category.score.toDouble())
                    labels.pushMap(label)
                }
                item.putArray("labels", labels)//Esto requiere que el modelo tenga metadatos con las etiquetas
                
                val top = detection.boundingBox.top.toDouble()
                val left = detection.boundingBox.left.toDouble()
                val right = detection.boundingBox.right.toDouble()
                val bottom = detection.boundingBox.bottom.toDouble()

                // Enviar coordenadas del cuadro delimitador
                val frame = Arguments.createMap()
                val origin = Arguments.createMap()
                origin.putDouble("y", top)
                origin.putDouble("x", left)

                val size = Arguments.createMap()
                size.putDouble("y", bottom  - top)
                size.putDouble("x", right - left)

                frame.putMap("origin", origin)
                frame.putMap("size", size)
                
                item.putMap("frame", frame)

                response.pushMap(item)
            }

            promise.resolve(response)

        } catch (e: Exception) {
            promise.reject("DETECTION_ERROR", e.message, e)
        }
    }
}