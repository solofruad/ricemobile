import { NativeModules } from "react-native";
const TtsVoicesModule = NativeModules.TtsVoicesModule;

export class TtsVoices {
    /**
   * Init TTS
   * @param expectedLanguageTag Tag of the preferred language for the voice (IANA Language Subtag Registry)
   * @see {@link https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry | IANA Language Subtag Registry}
   */
  static init(expectedLanguageTag: string):Promise<boolean>{
    return new Promise((resolve,reject)=>{
      (TtsVoicesModule.init(expectedLanguageTag) as Promise<boolean>)
        .then(solves=>{
          resolve(solves);
        })
        .catch(err=>{
          reject(err);
        })
    })
  }

  /**
   * Open Device TTS voice manager
   */
  static openVoicesInstaller(){
    TtsVoicesModule.openVoicesInstaller();
  }

  /**
  * Speak with the actual config
  * @param text Text to say
  * @return True if the text was spoken, false if not or text is too long
  */
  static speak(text: string): Promise<boolean>{
    return new Promise(resolve=>{
      ( TtsVoicesModule.speak(text) as Promise<boolean> )
        .then(res=>{
          resolve(res);
        })
    })
  }

  /**
   * True si el módulo nativo soporta enqueue (una dev build anterior no lo tiene).
   */
  static canEnqueue(): boolean {
    return typeof TtsVoicesModule?.enqueue === "function";
  }

  /**
   * Encola el texto detrás de lo que se esté diciendo, sin cortarlo
   * (para leer una respuesta por oraciones mientras llega).
   * @return True si se encoló, false si no o si el texto es demasiado largo
   */
  static enqueue(text: string): Promise<boolean> {
    if (!TtsVoices.canEnqueue()) {
      return Promise.resolve(false);
    }
    return (TtsVoicesModule.enqueue(text) as Promise<boolean>).catch(() => false);
  }

  /**
   * True si el módulo nativo puede informar si está hablando (una dev build anterior no lo tiene).
   */
  static canReportSpeaking(): boolean {
    return typeof TtsVoicesModule?.isSpeaking === "function";
  }

  /**
   * True mientras la voz está hablando o tiene fragmentos en cola.
   */
  static isSpeaking(): Promise<boolean> {
    if (!TtsVoices.canReportSpeaking()) {
      return Promise.resolve(false);
    }
    return (TtsVoicesModule.isSpeaking() as Promise<boolean>).catch(() => false);
  }

  /**
   * Stop speak
   */
  static stop(){
    TtsVoicesModule.stop();
  }

}