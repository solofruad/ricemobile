import AVFoundation
import Foundation
import React
import UIKit

/// Equivalente iOS de TtsVoicesModule.kt.
///
/// Diferencia clave con Android: en iOS no hay "motores TTS" instalables;
/// el sistema provee AVSpeechSynthesizer con voces integradas/descargables.
/// Por eso:
///   - init(tag) busca una voz del idioma pedido entre las voces del sistema.
///   - openVoicesInstaller() abre Ajustes > Accesibilidad > Contenido leido
///     (equivalente al instalador de voces de Android).
///
/// Interfaz expuesta a JavaScript (identica a la de Android):
///   init(expectedLanguageTag) -> Promise<boolean>
///   openVoicesInstaller()     -> void
///   speak(text)               -> Promise<boolean>
///   stop()                    -> void
///
/// NOTA: "init" es un nombre reservado para los inicializadores de ObjC/Swift,
/// por eso el metodo Swift se llama initTts y el bridge (RiceNativeBridge.m)
/// remapea el nombre JS a "init" con _RCT_EXTERN_REMAP_METHOD.
@objc(TtsVoicesModule)
final class TtsVoicesModule: NSObject {

  private static let synthesizer = AVSpeechSynthesizer()
  private static var selectedVoice: AVSpeechSynthesisVoice?

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(initTts:resolver:rejecter:)
  func initTts(_ expectedLanguageTag: String,
               resolver resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
    let tag = expectedLanguageTag.lowercased()
    let voices = AVSpeechSynthesisVoice.speechVoices()

    // Busqueda en orden de preferencia: match exacto ("es" == "es"),
    // mismo idioma region variante ("es" == "es-ES") y, como ultimo recurso,
    // la voz por defecto del sistema para ese idioma.
    let match =
      voices.first { $0.language.lowercased() == tag }
      ?? voices.first { $0.language.lowercased().hasPrefix("\(tag)-") }
      ?? voices.first { $0.language.lowercased().hasPrefix(tag) }
      ?? AVSpeechSynthesisVoice(language: expectedLanguageTag)

    guard let voice = match else {
      reject(
        "INITIALIZATION_ERROR",
        "No available TTS voices with the expected language tag \(expectedLanguageTag)",
        nil
      )
      return
    }

    TtsVoicesModule.selectedVoice = voice
    resolve(true)
  }

  @objc(openVoicesInstaller)
  func openVoicesInstaller() {
    DispatchQueue.main.async {
      // "App-Prefs" es un esquema no documentado pero util para apps
      // sideload/development (no pasa por App Store review).
      if let prefs = URL(string: "App-Prefs:ACCESSIBILITY&path=SPEECH_TITLE") {
        UIApplication.shared.open(prefs, options: [:]) { opened in
          if !opened, let settings = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(settings)
          }
        }
      } else if let settings = URL(string: UIApplication.openSettingsURLString) {
        UIApplication.shared.open(settings)
      }
    }
  }

  @objc(speak:resolver:rejecter:)
  func speak(_ text: String,
             resolver resolve: @escaping RCTPromiseResolveBlock,
             rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let utterance = AVSpeechUtterance(string: text)
      utterance.voice = TtsVoicesModule.selectedVoice
      utterance.rate = AVSpeechUtteranceDefaultSpeechRate
      // QUEUE_FLUSH en Android: corta lo que se este diciendo y habla de inmediato.
      TtsVoicesModule.synthesizer.stopSpeaking(at: .immediate)
      TtsVoicesModule.synthesizer.speak(utterance)
      resolve(true)
    }
  }

  @objc(stop)
  func stop() {
    DispatchQueue.main.async {
      TtsVoicesModule.synthesizer.stopSpeaking(at: .immediate)
    }
  }
}
