import Foundation
import AVFoundation

// MARK: - TtsVoices Class

class TtsVoices: NSObject, AVSpeechSynthesizerDelegate {
    
    static let shared = TtsVoices()
    
    private let synthesizer = AVSpeechSynthesizer()
    private var expectedLanguage: String = "es-ES"
    
    override init() {
        super.init()
        synthesizer.delegate = self
    }
    
    // MARK: - Configuration
    
    /// Cambiar el idioma de las voces a buscar
    /// - Parameter languageTag: Tag del idioma deseado (ej: "es-ES", "en-US")
    func setExpectedLanguage(_ languageTag: String) {
        self.expectedLanguage = languageTag
        print("Idioma de síntesis establecido a: \(languageTag)")
    }
    
    // MARK: - Initialization
    
    /// Inicializar el Text-to-Speech
    /// - Parameters:
    ///   - expectedLanguageTag: Tag del idioma deseado (ej: "es-ES")
    ///   - completion: Callback que indica si se encontró una voz válida
    func initialize(expectedLanguageTag: String? = nil, completion: @escaping (Bool) -> Void) {
        if let languageTag = expectedLanguageTag {
            setExpectedLanguage(languageTag)
        }
        
        // En iOS, AVFoundation maneja automáticamente las voces disponibles
        // Verificamos si existe una voz para el idioma especificado
        let availableVoices = AVSpeechSynthesisVoice.speechVoices()
        let voiceFound = availableVoices.contains { voice in
            voice.language.starts(with: String(self.expectedLanguage.prefix(2)))
        }
        
        if voiceFound {
            print("Voz encontrada para idioma: \(expectedLanguage)")
            completion(true)
        } else {
            print("No se encontró una voz para el idioma: \(expectedLanguage)")
            completion(false)
        }
    }
    
    /// Destruir el sintetizador
    func destroy() {
        synthesizer.stopSpeaking(at: .immediate)
    }
    
    // MARK: - Voice Selection
    
    /// Obtener una voz válida para el idioma configurado
    /// - Returns: AVSpeechSynthesisVoice si existe, nil si no
    private func getValidVoice() -> AVSpeechSynthesisVoice? {
        let availableVoices = AVSpeechSynthesisVoice.speechVoices()
        
        // Buscar voz exacta para el idioma
        if let exactVoice = availableVoices.first(where: { $0.language == expectedLanguage }) {
            return exactVoice
        }
        
        // Buscar voz que coincida con el código de idioma (ej: "es" de "es-ES")
        let languageCode = String(expectedLanguage.prefix(2))
        if let languageVoice = availableVoices.first(where: { $0.language.starts(with: languageCode) }) {
            return languageVoice
        }
        
        return nil
    }
    
    /// Obtener lista de idiomas disponibles
    /// - Returns: Array de códigos de idioma disponibles
    func getAvailableLanguages() -> [String] {
        return Array(Set(AVSpeechSynthesisVoice.speechVoices().map { $0.language }))
    }
    
    // MARK: - Speaking
    
    /// Hablar un texto
    /// - Parameter text: Texto a sintetizar
    /// - Returns: true si la síntesis comenzó, false si hay error
    @discardableResult
    func speak(_ text: String) -> Bool {
        // Verificar longitud máxima permitida
        let maxLength = 32767 // Límite aproximado de iOS
        guard text.count <= maxLength else {
            print("El texto es demasiado largo (máximo \(maxLength) caracteres)")
            return false
        }
        
        // Detener síntesis actual
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
        
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = getValidVoice()
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0
        
        synthesizer.speak(utterance)
        return true
    }
    
    /// Detener la síntesis actual
    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }
    
    /// Pausar la síntesis actual
    func pause() {
        if #available(iOS 10.0, *) {
            synthesizer.pauseSpeaking(at: .word)
        }
    }
    
    /// Continuar síntesis pausada
    func resume() {
        if #available(iOS 10.0, *) {
            synthesizer.continueSpeaking()
        }
    }
    
    /// Verificar si está hablando
    /// - Returns: true si hay síntesis en progreso
    func isSpeaking() -> Bool {
        return synthesizer.isSpeaking
    }
    
    // MARK: - AVSpeechSynthesizerDelegate
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        print("Síntesis iniciada")
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        print("Síntesis finalizada")
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didPause utterance: AVSpeechUtterance) {
        print("Síntesis pausada")
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didContinue utterance: AVSpeechUtterance) {
        print("Síntesis reanudada")
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        print("Síntesis cancelada")
    }
}
