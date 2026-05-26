package com.anonymous.myapp

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.camera.core.ImageProxy
import java.io.InputStream
import androidx.core.net.toUri

class PhotoFixer {
    companion object {
        fun generateBitmapFromImageProxy(image: ImageProxy): Bitmap {
            val rotationDegrees = image.imageInfo.rotationDegrees
            val bitmap = image.toBitmap() // Convert ImageProxy to Bitmap
            image.close()
            //*Corregir la rotacion de la imagen de forma automatica
            val correctedBitmap = if (rotationDegrees != 0) {
                val matrix = Matrix().apply { postRotate(rotationDegrees.toFloat()) }
                Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
            } else {
                bitmap
            }
            return correctedBitmap
        }

        fun generateBitmapFromURI(context: Context, imageUri: String): Bitmap {
            val uri = imageUri.toUri()
            val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
            val bitmap = BitmapFactory.decodeStream(inputStream)

            return bitmap
        }
    }
}