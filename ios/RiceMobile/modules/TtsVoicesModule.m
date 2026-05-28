import React

// Módulo React Native para TtsVoices
@objc(TtsVoicesModule)
class TtsVoicesModule: NSObject {
    
    private static let ttsVoices = TtsVoices.shared
    
    // MARK: - Module Setup
    
    @objc
    static func moduleName() -> String! {
        return "TtsVoicesModule"
    }
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // MARK: - Initialize
    
    @objc
    func initialize(_ expectedLanguageTag: String?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            TtsVoicesModule.ttsVoices.initialize(expectedLanguageTag: expectedLanguageTag) { success in
                resolve(NSNumber(value: success))
            }
        }
    }
    
    // MARK: - Set Language
    
    @objc
    func setExpectedLanguage(_ languageTag: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            TtsVoicesModule.ttsVoices.setExpectedLanguage(languageTag)
            resolve(NSNull())
        }
    }
    
    // MARK: - Get Available Languages
    
    @objc
    func getAvailableLanguages(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let languages = TtsVoicesModule.ttsVoices.getAvailableLanguages()
        resolve(languages)
    }
    
    // MARK: - Speak
    
    @objc
    func speak(_ text: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            let success = TtsVoicesModule.ttsVoices.speak(text)
            resolve(NSNumber(value: success))
        }
    }
    
    // MARK: - Stop
    
    @objc
    func stop(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            TtsVoicesModule.ttsVoices.stop()
            resolve(NSNull())
        }
    }
    
    // MARK: - Pause
    
    @objc
    func pause(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            TtsVoicesModule.ttsVoices.pause()
            resolve(NSNull())
        }
    }
    
    // MARK: - Resume
    
    @objc
    func resume(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            TtsVoicesModule.ttsVoices.resume()
            resolve(NSNull())
        }
    }
    
    // MARK: - Is Speaking
    
    @objc
    func isSpeaking(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let speaking = TtsVoicesModule.ttsVoices.isSpeaking()
        resolve(NSNumber(value: speaking))
    }
    
    // MARK: - Destroy
    
    @objc
    func destroy(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            TtsVoicesModule.ttsVoices.destroy()
            resolve(NSNull())
        }
    }
}
