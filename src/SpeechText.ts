import * as vosk from 'react-native-vosk';


export default class SpeechText{
  private result:string = "";

  constructor(onPartial:(text:string)=>void, onComplete:(text:string)=>void){
    vosk.onResult((res) => {
      //The user have stopped talking
      this.stop();
      this.result = res;
      onComplete(res);
    });

    vosk.onPartialResult((res) => {
      //The user keeps talking
      this.result = res;
      onPartial(res);
    });
  }

  /**
   * Empieza a grabar. vosk.start() pide el permiso de micrófono en Android y rechaza
   * ('Record permission not granted') si se niega: quien llama debe manejar el rechazo.
   */
  record(): Promise<void>{
    // Cada grabación empieza vacía: si no, stop() devolvería el texto del dictado anterior.
    this.result = "";
    return Promise.resolve(vosk.start()).then(() => undefined);
  }

  stop(){
    vosk.stop();
    return this.result;
  }

}
