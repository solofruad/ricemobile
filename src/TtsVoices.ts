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
   * Stop speak
   */
  static stop(){
    TtsVoicesModule.stop();
  }

}