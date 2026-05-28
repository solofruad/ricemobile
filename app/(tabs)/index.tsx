import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { ObjectDetection } from '../../src/ObjectDetection';
import CamScan from '../cameraScan/camscan';
import Database from '@/database/db';
import * as vosk from 'react-native-vosk';
import { TtsVoices } from '@/src/TtsVoices';

function startTtsVoice():Promise<void>{
  return new Promise(resolve=>{
    TtsVoices.init("es")
      .then((_)=>{
        resolve();
        TtsVoices.speak("Bienvenido nuevamente.");
      })
      .catch(err=>{
         console.error(err)
         TtsVoices.openVoicesInstaller()
         resolve();
      })
  });
}


export default function HomeScreen() {
  const [initialized, setInitialized] = useState(false);  
  useEffect(() => {
      new Database();
      //@ts-ignore

      startTtsVoice()
      .then(_=>{
        //Inicializamos el detector de objetos al iniciar la app
        ObjectDetection.initializeDetector(7, 0.4)
        .then(()=>{
          vosk
            .loadModel('model-es-es')
            .then(_ => setInitialized(true))
            .catch((e) => console.error(e));
        })
        .catch((err)=>{
          console.log("Error initializing object detection model", err);
        });
      })
  
  }, []);
  if(!initialized){
    return <Text style={{color:"white", position:"absolute", top:"50%", width:"100%", textAlign:"center", fontSize:32}}>Cargando...</Text>
  }
  return <CamScan/>
}