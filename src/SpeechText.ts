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

  record(){
     vosk.start()
  }

  stop(){
    vosk.stop();
    return this.result;
  }

}
