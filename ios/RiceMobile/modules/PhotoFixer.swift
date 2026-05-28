import Foundation
import UIKit
import Photos

// MARK: - PhotoFixer Class

class PhotoFixer {
    
    /// Convertir CMSampleBuffer a UIImage (desde cámara)
    /// - Parameter buffer: CMSampleBuffer de la cámara
    /// - Returns: UIImage procesada y rotada correctamente
    static func generateUIImage(fromCMSampleBuffer buffer: CMSampleBuffer) -> UIImage? {
        guard let imageBuffer = CMSampleBufferGetImageBuffer(buffer) else { return nil }
        
        // Crear CGImage desde el buffer
        let ciImage = CIImage(cvPixelBuffer: imageBuffer)
        let context = CIContext(options: nil)
        
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else { return nil }
        
        // Obtener orientación y crear UIImage
        let image = UIImage(cgImage: cgImage, scale: 1.0, orientation: .right)
        
        // Corregir rotación automáticamente
        return fixImageOrientation(image)
    }
    
    /// Generar UIImage desde URI (archivo local o remoto)
    /// - Parameter imageUri: URI del archivo (file://, http://, etc.)
    /// - Returns: UIImage cargada
    static func generateUIImage(fromURI imageUri: String) throws -> UIImage {
        // Convertir string a URL
        guard let url = URL(string: imageUri) else {
            throw NSError(domain: "PhotoFixer", code: -1, userInfo: [NSLocalizedDescriptionKey: "URI inválida: \(imageUri)"])
        }
        
        let imageData: Data
        
        if url.scheme == "file" {
            // Archivo local
            imageData = try Data(contentsOf: url)
        } else if url.scheme == "ph" {
            // Asset de Fotos (Photos framework)
            let asset = PHAsset.fetchAssets(withAltLocalIdentifiers: [url.absoluteString], options: nil).firstObject
            guard let asset = asset else {
                throw NSError(domain: "PhotoFixer", code: -2, userInfo: [NSLocalizedDescriptionKey: "No se encontró el asset de fotos"])
            }
            
            var resultImage: UIImage?
            let semaphore = DispatchSemaphore(value: 0)
            
            PHImageManager.default().requestImage(for: asset, targetSize: CGSize(width: 1000, height: 1000), contentMode: .aspectFill, options: nil) { image, _ in
                resultImage = image
                semaphore.signal()
            }
            
            semaphore.wait()
            guard let image = resultImage else {
                throw NSError(domain: "PhotoFixer", code: -3, userInfo: [NSLocalizedDescriptionKey: "No se pudo cargar la imagen del asset"])
            }
            
            return image
        } else if url.scheme == "http" || url.scheme == "https" {
            // URL remota
            imageData = try Data(contentsOf: url)
        } else {
            throw NSError(domain: "PhotoFixer", code: -4, userInfo: [NSLocalizedDescriptionKey: "Esquema de URI no soportado: \(url.scheme ?? "unknown")"])
        }
        
        guard let image = UIImage(data: imageData) else {
            throw NSError(domain: "PhotoFixer", code: -5, userInfo: [NSLocalizedDescriptionKey: "No se pudo decodificar la imagen"])
        }
        
        return fixImageOrientation(image)
    }
    
    /// Corregir la orientación de una imagen automáticamente
    /// - Parameter image: UIImage con posible rotación incorrecta
    /// - Returns: UIImage con orientación corregida
    static func fixImageOrientation(_ image: UIImage) -> UIImage {
        if image.imageOrientation == .up {
            return image
        }
        
        let size = image.size
        let scale = image.scale
        
        UIGraphicsBeginImageContextWithOptions(size, false, scale)
        image.draw(in: CGRect(origin: .zero, size: size))
        let correctedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return correctedImage ?? image
    }
    
    /// Redimensionar imagen a un tamaño específico
    /// - Parameters:
    ///   - image: Imagen a redimensionar
    ///   - size: Nuevo tamaño
    /// - Returns: Imagen redimensionada
    static func resizeImage(_ image: UIImage, to size: CGSize) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }
    
    /// Crear PIXelBuffer desde UIImage (para procesamiento de IA/visión)
    /// - Parameter image: UIImage a convertir
    /// - Returns: CVPixelBuffer o nil si hay error
    static func createPixelBuffer(from image: UIImage) -> CVPixelBuffer? {
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
        
        guard let context = CGContext(
            data: data,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: rgbColorSpace,
            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
        ) else {
            return nil
        }
        
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        
        return buffer
    }
    
    /// Aplicar filtro de contraste a una imagen
    /// - Parameters:
    ///   - image: Imagen original
    ///   - contrast: Valor de contraste (0.5 = reduce, 1.0 = normal, 1.5 = aumenta)
    /// - Returns: Imagen con contraste aplicado
    static func applyContrast(_ image: UIImage, contrast: CGFloat) -> UIImage {
        guard let cgImage = image.cgImage else { return image }
        
        let ciImage = CIImage(cgImage: cgImage)
        let filter = CIFilter(name: "CIColorControls")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(contrast, forKey: kCIInputContrastKey)
        
        guard let outputImage = filter?.outputImage else { return image }
        
        let context = CIContext(options: nil)
        guard let processedCGImage = context.createCGImage(outputImage, from: outputImage.extent) else { return image }
        
        return UIImage(cgImage: processedCGImage, scale: image.scale, orientation: image.imageOrientation)
    }
    
    /// Aplicar filtro de brillo a una imagen
    /// - Parameters:
    ///   - image: Imagen original
    ///   - brightness: Valor de brillo (-1.0 a 1.0)
    /// - Returns: Imagen con brillo aplicado
    static func applyBrightness(_ image: UIImage, brightness: CGFloat) -> UIImage {
        guard let cgImage = image.cgImage else { return image }
        
        let ciImage = CIImage(cgImage: cgImage)
        let filter = CIFilter(name: "CIColorControls")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(brightness, forKey: kCIInputBrightnessKey)
        
        guard let outputImage = filter?.outputImage else { return image }
        
        let context = CIContext(options: nil)
        guard let processedCGImage = context.createCGImage(outputImage, from: outputImage.extent) else { return image }
        
        return UIImage(cgImage: processedCGImage, scale: image.scale, orientation: image.imageOrientation)
    }
    
    /// Aplicar filtro de saturación a una imagen
    /// - Parameters:
    ///   - image: Imagen original
    ///   - saturation: Valor de saturación (0.0 = escala de grises, 1.0 = normal, 2.0 = muy saturada)
    /// - Returns: Imagen con saturación aplicada
    static func applySaturation(_ image: UIImage, saturation: CGFloat) -> UIImage {
        guard let cgImage = image.cgImage else { return image }
        
        let ciImage = CIImage(cgImage: cgImage)
        let filter = CIFilter(name: "CIColorControls")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(saturation, forKey: kCIInputSaturationKey)
        
        guard let outputImage = filter?.outputImage else { return image }
        
        let context = CIContext(options: nil)
        guard let processedCGImage = context.createCGImage(outputImage, from: outputImage.extent) else { return image }
        
        return UIImage(cgImage: processedCGImage, scale: image.scale, orientation: image.imageOrientation)
    }
    
    /// Convertir imagen a escala de grises
    /// - Parameter image: Imagen original
    /// - Returns: Imagen en escala de grises
    static func toGrayscale(_ image: UIImage) -> UIImage {
        guard let cgImage = image.cgImage else { return image }
        
        let ciImage = CIImage(cgImage: cgImage)
        let filter = CIFilter(name: "CIColorDesaturate")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        
        guard let outputImage = filter?.outputImage else { return image }
        
        let context = CIContext(options: nil)
        guard let processedCGImage = context.createCGImage(outputImage, from: outputImage.extent) else { return image }
        
        return UIImage(cgImage: processedCGImage, scale: image.scale, orientation: image.imageOrientation)
    }
}
