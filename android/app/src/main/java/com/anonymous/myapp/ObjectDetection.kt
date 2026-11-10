package com.anonymous.myapp

import android.content.Context
import android.graphics.Bitmap
import android.graphics.RectF
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder

import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetectorResult
import com.google.mediapipe.tasks.vision.objectdetector.ObjectDetector as MPObjectDetector
import com.google.mediapipe.tasks.core.BaseOptions as MPBaseOptions
import com.google.mediapipe.tasks.components.containers.Detection as MPDetection
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel

// Modelo original de prueba (MediaPipe, con NMS embebido)
const val LEGACY_MODEL_PATH = "model.tflite"
// Nuevo modelo LiteRT exportado (YOLO crudo [1,8,8400], sin NMS embebido)
const val LITERT_MODEL_PATH = "rice2.tflite"
// Se conserva por compatibilidad con llamadas antiguas: apunta al modelo de prueba
const val MODEL_PATH = LEGACY_MODEL_PATH

// Switch interno: true = nueva implementacion LiteRT por defecto,
// false = implementacion original MediaPipe. Permite restaurar en cualquier momento.
// NOTA ricemobile: se deja en true por decision de producto (default LiteRT nuevo);
// RiceAR lo tiene en false. El puente JS puede forzar "mediapipe-legacy" explícito.
const val USE_LITERT_BY_DEFAULT = true

// --- Configuracion del nuevo modelo LiteRT ---
const val LITERT_INPUT_SIZE = 640
const val LITERT_NUM_ANCHORS = 8400
const val LITERT_NUM_ATTRS = 8 // 4 box (cx,cy,w,h) + 4 clases
const val LITERT_NUM_CLASSES = 4
const val CONF_THRESHOLD = 0.1f
const val IOU_THRESHOLD = 0.45f
const val LITERT_NUM_THREADS = 4

val LITERT_CLASS_NAMES = listOf(
    "Rynchosporium", // 0
    "Pyricularia",   // 1
    "Lepidoptera",   // 2
    "Cercospora"     // 3
)

enum class ProcessingFramework {
    MEDIAPIPE,
    LITERT
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

private data class RawCandidate(
    val rect: RectF, // en pixeles de la imagen ORIGINAL
    val classId: Int,
    val score: Float
)

class ObjectDetection {
    companion object {
        var processingFramework: ProcessingFramework =
            if (USE_LITERT_BY_DEFAULT) ProcessingFramework.LITERT else ProcessingFramework.MEDIAPIPE
        var detector: Any? = null

        // Parametros vigentes cuando se usa LITERT (se fijan en setup)
        var litertMaxResults: Int = 25
        var litertConfThreshold: Float = CONF_THRESHOLD

        fun defaultFramework(): ProcessingFramework =
            if (USE_LITERT_BY_DEFAULT) ProcessingFramework.LITERT else ProcessingFramework.MEDIAPIPE

        fun closeDetector() {
            try {
                when (val d = detector) {
                    is MPObjectDetector -> d.close()
                    is Interpreter -> d.close()
                }
            } catch (e: Exception) {
                Log.e("ObjectDetection", "Error al cerrar detector: ${e.message}")
            } finally {
                detector = null
            }
        }
    }

    fun setupObjectDetector(
        context: Context,
        maxResults: Int,
        scoreThreshold: Float,
        processingFramework: ProcessingFramework = defaultFramework(),
        modelPath: String = ""
    ) {
        ObjectDetection.processingFramework = processingFramework
        // Cierra el detector anterior antes de cargar otro (cambio de framework/modelo)
        closeDetector()
        if (processingFramework == ProcessingFramework.LITERT) {
            val effectivePath = modelPath.ifEmpty { LITERT_MODEL_PATH }
            setupLitertObjectDetector(context, maxResults, scoreThreshold, effectivePath)
        } else {
            val effectivePath = modelPath.ifEmpty { LEGACY_MODEL_PATH }
            setupMPObjectDetector(context, maxResults, scoreThreshold, effectivePath)
        }
    }

    // ---- Implementacion ORIGINAL (MediaPipe, modelo de prueba) ----

    private fun setupMPObjectDetector(context: Context, maxResults: Int, scoreThreshold: Float, modelPath:String) {
        val baseOptionsBuilder = MPBaseOptions.builder()
            .setModelAssetPath(modelPath) // modelo en assets

        val optionsBuilder = MPObjectDetector.ObjectDetectorOptions.builder()
            .setBaseOptions(baseOptionsBuilder.build())
            .setScoreThreshold(scoreThreshold) // Confianza mínima
            .setMaxResults(maxResults) //Numero maximo de detecciones
            .setRunningMode(RunningMode.IMAGE)


        try {
            ObjectDetection.detector = MPObjectDetector.createFromOptions(context, optionsBuilder.build())
        } catch (e: IllegalStateException) {
            Log.e("ObjectDetection", "Error al cargar el modelo: ${e.message}")
        }
    }

    // ---- Nueva implementacion LiteRT (NCHW float32 + tensor [1,8,8400] + NMS) ----

    private fun setupLitertObjectDetector(context: Context, maxResults: Int, scoreThreshold: Float, modelPath: String) {
        ObjectDetection.litertMaxResults = maxResults
        // Si el llamador pasa un umbral valido se respeta; si no, se usa CONF_THRESHOLD
        ObjectDetection.litertConfThreshold =
            if (scoreThreshold >= 0f && scoreThreshold < 1f) scoreThreshold else CONF_THRESHOLD
        try {
            val modelBuffer = loadModelFile(context, modelPath)
            val options = Interpreter.Options().setNumThreads(LITERT_NUM_THREADS)
            val interpreter = Interpreter(modelBuffer, options)
            // Log defensivo de shapes reales (NCHW vs NHWC, [1,8,8400] vs [1,8400,8])
            try {
                val inShape = interpreter.getInputTensor(0).shape()
                val outShape = interpreter.getOutputTensor(0).shape()
                Log.i(
                    "ObjectDetection",
                    "LiteRT modelo '$modelPath' input=${inShape.contentToString()} " +
                        "output=${outShape.contentToString()}"
                )
            } catch (e: Exception) {
                Log.w("ObjectDetection", "No se pudo inspeccionar tensores: ${e.message}")
            }
            ObjectDetection.detector = interpreter
        } catch (e: Exception) {
            Log.e("ObjectDetection", "Error al cargar modelo LiteRT '$modelPath': ${e.message}")
            ObjectDetection.detector = null
        }
    }

    private fun loadModelFile(context: Context, modelPath: String): ByteBuffer {
        val fd = context.assets.openFd(modelPath)
        val inputStream = FileInputStream(fd.fileDescriptor)
        val channel = inputStream.channel
        return channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
    }

    fun runObjectDetection(bitmap: Bitmap): List<DetectionData> {
        if (ObjectDetection.detector == null) {
            return emptyList()
        }

        if (ObjectDetection.processingFramework == ProcessingFramework.LITERT) {
            return runLitertDetection(bitmap)
        }

        lateinit var results: Any //* ObjectDetectorResult
        if(ObjectDetection.processingFramework == ProcessingFramework.MEDIAPIPE){
            val image = BitmapImageBuilder(bitmap).build()
            results = (ObjectDetection.detector as MPObjectDetector).detect(image)
        }

        return processResults(results, bitmap.width, bitmap.height)
    }

    // ---- Camino MediaPipe (con clamping estilo ricemobile, ausente en RiceAR) ----

    private fun processResults(result: Any, imageWidth: Int, imageHeight: Int): List<DetectionData> {
        val resultsList = (result as ObjectDetectorResult).detections()

        lateinit var box: RectF
        lateinit var labels: List<Label>
        return resultsList.mapNotNull { detection ->
            if(processingFramework == ProcessingFramework.MEDIAPIPE) {
                val detection = detection as MPDetection
                box = detection.boundingBox()
                labels = detection.categories().map { category ->
                    Label(category.categoryName(), category.score())
                }
            }

            // Recorta la caja a los limites de la imagen: el modelo puede
            // devolver coordenadas ligeramente negativas o mayores al borde.
            val left = box.left.coerceIn(0f, imageWidth.toFloat())
            val top = box.top.coerceIn(0f, imageHeight.toFloat())
            val right = box.right.coerceIn(0f, imageWidth.toFloat())
            val bottom = box.bottom.coerceIn(0f, imageHeight.toFloat())
            val width = (right - left).coerceAtLeast(0f)
            val height = (bottom - top).coerceAtLeast(0f)
            // Descarta cajas degeneradas (totalmente fuera de la imagen).
            if (width < 1f || height < 1f) return@mapNotNull null

            val frame = Frame(
                Point(left.toInt(), top.toInt()),
                Point(width.toInt(), height.toInt())
            )

            DetectionData(frame, labels)
        }
    }

    // ---- Camino nuevo LiteRT ----

    private fun runLitertDetection(bitmap: Bitmap): List<DetectionData> {
        val interpreter = ObjectDetection.detector as? Interpreter ?: return emptyList()
        val origW = bitmap.width
        val origH = bitmap.height
        if (origW <= 0 || origH <= 0) return emptyList()

        // Stretch simple 640x640 (decidido con el usuario; sin letterbox)
        val scaled = Bitmap.createScaledBitmap(bitmap, LITERT_INPUT_SIZE, LITERT_INPUT_SIZE, true)
        return try {
            val useNCHW = isNCHWInput(interpreter)
            val inputBuffer = if (useNCHW) preprocessNCHW(scaled) else preprocessNHWC(scaled)
            val output = runInterpreter(interpreter, inputBuffer)
            if (output == null) {
                Log.e("ObjectDetection", "Forma de salida no soportada por el parser")
                emptyList()
            } else {
                decodeAndNms(output, origW, origH)
            }
        } catch (e: Exception) {
            Log.e("ObjectDetection", "Error en inferencia LiteRT: ${e.message}")
            emptyList()
        } finally {
            if (!scaled.isRecycled) scaled.recycle()
        }
    }

    /**
     * Preprocesamiento: NHWC uint8 (0-255) -> NCHW float32 (0.0-1.0).
     * El bitmap de entrada ya debe estar en 640x640.
     */
    private fun isNCHWInput(interpreter: Interpreter): Boolean {
        return try {
            val s = interpreter.getInputTensor(0).shape() // [1,3,640,640] vs [1,640,640,3]
            !(s.size == 4 && s[0] == 1 && s[1] == LITERT_INPUT_SIZE && s[2] == LITERT_INPUT_SIZE && s[3] == 3)
        } catch (e: Exception) {
            true // por defecto, segun especificacion NCHW
        }
    }

    private fun preprocessNHWC(bitmap640: Bitmap): ByteBuffer {
        val buffer = ByteBuffer
            .allocateDirect(1 * LITERT_INPUT_SIZE * LITERT_INPUT_SIZE * 3 * 4)
            .order(ByteOrder.nativeOrder())
        val pixels = IntArray(LITERT_INPUT_SIZE * LITERT_INPUT_SIZE)
        bitmap640.getPixels(pixels, 0, LITERT_INPUT_SIZE, 0, 0, LITERT_INPUT_SIZE, LITERT_INPUT_SIZE)
        for (pixel in pixels) {
            buffer.putFloat(((pixel shr 16) and 0xFF) / 255.0f)
            buffer.putFloat(((pixel shr 8) and 0xFF) / 255.0f)
            buffer.putFloat((pixel and 0xFF) / 255.0f)
        }
        buffer.rewind()
        return buffer
    }

    private fun preprocessNCHW(bitmap640: Bitmap): ByteBuffer {
        val buffer = ByteBuffer
            .allocateDirect(1 * 3 * LITERT_INPUT_SIZE * LITERT_INPUT_SIZE * 4)
            .order(ByteOrder.nativeOrder())
        val pixels = IntArray(LITERT_INPUT_SIZE * LITERT_INPUT_SIZE)
        bitmap640.getPixels(pixels, 0, LITERT_INPUT_SIZE, 0, 0, LITERT_INPUT_SIZE, LITERT_INPUT_SIZE)
        // Orden NCHW: primero todo R, luego G, luego B
        for (c in 0 until 3) {
            val shift = when (c) {
                0 -> 16 // R
                1 -> 8  // G
                else -> 0 // B
            }
            for (i in pixels.indices) {
                val v = (pixels[i] shr shift) and 0xFF
                buffer.putFloat(v / 255.0f)
            }
        }
        buffer.rewind()
        return buffer
    }

    /**
     * Ejecuta el Interpreter tolerando las dos variantes de layout:
     * [1,8,8400] (canal-primero) y [1,8400,8] (ancla-primero).
     * Retorna siempre la vista normalizada [8][8400].
     */
    private fun runInterpreter(interpreter: Interpreter, input: ByteBuffer): Array<FloatArray>? {
        val outShape = try {
            interpreter.getOutputTensor(0).shape()
        } catch (e: Exception) {
            null
        }
        return when {
            outShape != null && outShape.size == 3 &&
                outShape[0] == 1 && outShape[1] == LITERT_NUM_ATTRS && outShape[2] == LITERT_NUM_ANCHORS -> {
                val raw = Array(1) { Array(LITERT_NUM_ATTRS) { FloatArray(LITERT_NUM_ANCHORS) } }
                interpreter.run(input, raw)
                raw[0]
            }
            outShape != null && outShape.size == 3 &&
                outShape[0] == 1 && outShape[1] == LITERT_NUM_ANCHORS && outShape[2] == LITERT_NUM_ATTRS -> {
                val rawT = Array(1) { Array(LITERT_NUM_ANCHORS) { FloatArray(LITERT_NUM_ATTRS) } }
                interpreter.run(input, rawT)
                transpose8400x8to8x8400(rawT[0])
            }
            else -> {
                // Fallback: intenta [1,8,8400] directamente (modelo segun especificacion)
                try {
                    val raw = Array(1) { Array(LITERT_NUM_ATTRS) { FloatArray(LITERT_NUM_ANCHORS) } }
                    interpreter.run(input, raw)
                    raw[0]
                } catch (e: Exception) {
                    Log.e("ObjectDetection", "Fallback [1,8,8400] fallo: ${e.message}")
                    try {
                        val rawT = Array(1) { Array(LITERT_NUM_ANCHORS) { FloatArray(LITERT_NUM_ATTRS) } }
                        interpreter.run(input, rawT)
                        transpose8400x8to8x8400(rawT[0])
                    } catch (e2: Exception) {
                        Log.e("ObjectDetection", "Fallback [1,8400,8] fallo: ${e2.message}")
                        null
                    }
                }
            }
        }
    }

    private fun transpose8400x8to8x8400(src: Array<FloatArray>): Array<FloatArray> {
        val dst = Array(LITERT_NUM_ATTRS) { FloatArray(LITERT_NUM_ANCHORS) }
        for (i in 0 until LITERT_NUM_ANCHORS) {
            val row = src[i]
            for (a in 0 until LITERT_NUM_ATTRS) {
                dst[a][i] = row[a]
            }
        }
        return dst
    }

    private fun decodeAndNms(
        output8x8400: Array<FloatArray>,
        origW: Int,
        origH: Int
    ): List<DetectionData> {
        val confThresh = ObjectDetection.litertConfThreshold
        val scaleX = origW.toFloat() / LITERT_INPUT_SIZE
        val scaleY = origH.toFloat() / LITERT_INPUT_SIZE
        val candidates = ArrayList<RawCandidate>(256)

        for (i in 0 until LITERT_NUM_ANCHORS) {
            var cx = output8x8400[0][i]
            var cy = output8x8400[1][i]
            var w = output8x8400[2][i]
            var h = output8x8400[3][i]

            // Tolerancia: si el modelo entrega coords normalizadas 0..1, llevar a 0..640
            if (cx <= 1.5f && cy <= 1.5f && w <= 1.5f && h <= 1.5f && w >= 0f && h >= 0f) {
                cx *= LITERT_INPUT_SIZE
                cy *= LITERT_INPUT_SIZE
                w *= LITERT_INPUT_SIZE
                h *= LITERT_INPUT_SIZE
            }
            if (w <= 0f || h <= 0f) continue

            // argmax entre las 4 clases (indices 4..7)
            var bestId = 0
            var bestScore = output8x8400[4][i]
            for (k in 1 until LITERT_NUM_CLASSES) {
                val s = output8x8400[4 + k][i]
                if (s > bestScore) {
                    bestScore = s
                    bestId = k
                }
            }
            if (bestScore < confThresh) continue

            // cxcywh (640) -> esquinas (640) -> esquinas (original)
            val xmin640 = cx - w / 2f
            val ymin640 = cy - h / 2f
            val xmax640 = cx + w / 2f
            val ymax640 = cy + h / 2f
            // Clamping estilo ricemobile (igual que processResults MediaPipe):
            // recorta a [0, W/H] y descarta cajas degeneradas <1px.
            val left = (xmin640 * scaleX).coerceIn(0f, origW.toFloat())
            val top = (ymin640 * scaleY).coerceIn(0f, origH.toFloat())
            val right = (xmax640 * scaleX).coerceIn(0f, origW.toFloat())
            val bottom = (ymax640 * scaleY).coerceIn(0f, origH.toFloat())
            val width = (right - left).coerceAtLeast(0f)
            val height = (bottom - top).coerceAtLeast(0f)
            if (width < 1f || height < 1f) continue

            candidates.add(RawCandidate(RectF(left, top, right, bottom), bestId, bestScore))
        }

        if (candidates.isEmpty()) return emptyList()
        val kept = nmsPerClass(candidates, IOU_THRESHOLD)
        // Top-N global por score, como maxResults de MediaPipe
        val top = kept.sortedByDescending { it.score }.take(ObjectDetection.litertMaxResults)

        return top.map { c ->
            val labelName = LITERT_CLASS_NAMES.getOrElse(c.classId) { "class_${c.classId}" }
            DetectionData(
                Frame(
                    Point(c.rect.left.toInt(), c.rect.top.toInt()),
                    Point(c.rect.width().toInt(), c.rect.height().toInt())
                ),
                listOf(Label(labelName, c.score))
            )
        }
    }

    /**
     * NMS por clase: ordena por score, suprime cajas con IoU > umbral dentro de la misma clase.
     */
    private fun nmsPerClass(candidates: List<RawCandidate>, iouThreshold: Float): List<RawCandidate> {
        val result = ArrayList<RawCandidate>(candidates.size)
        val byClass = candidates.groupBy { it.classId }
        for ((_, list) in byClass) {
            val sorted = list.sortedByDescending { it.score }.toMutableList()
            val active = BooleanArray(sorted.size) { true }
            for (i in sorted.indices) {
                if (!active[i]) continue
                val a = sorted[i]
                result.add(a)
                for (j in i + 1 until sorted.size) {
                    if (!active[j]) continue
                    if (iou(a.rect, sorted[j].rect) > iouThreshold) {
                        active[j] = false
                    }
                }
            }
        }
        return result
    }

    private fun iou(a: RectF, b: RectF): Float {
        val interLeft = maxOf(a.left, b.left)
        val interTop = maxOf(a.top, b.top)
        val interRight = minOf(a.right, b.right)
        val interBottom = minOf(a.bottom, b.bottom)
        val interW = interRight - interLeft
        val interH = interBottom - interTop
        if (interW <= 0f || interH <= 0f) return 0f
        val inter = interW * interH
        val union = a.width() * a.height() + b.width() * b.height() - inter
        if (union <= 0f) return 0f
        return inter / union
    }
}
