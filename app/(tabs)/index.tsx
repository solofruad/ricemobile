import Database from '@/database/Database';
import DetectionsTable from '@/database/tables/DetectionsTable';
import MonitorDrawingsTable from '@/database/tables/MonitorDrawingsTable';
import { TtsVoices } from '@/src/TtsVoices';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as vosk from 'react-native-vosk';
import { ObjectDetection } from '../../src/ObjectDetection';
import CamScan from '../cameraScan/camscan';

const TTS_LANGUAGE = "es";
const OBJECT_DETECTOR_MAX_RESULTS = 7;
const OBJECT_DETECTOR_SCORE_THRESHOLD = 0.4;

function startTtsVoice():Promise<void>{
  return new Promise(resolve=>{
    TtsVoices.init(TTS_LANGUAGE)
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
  const [loadPhase, setLoadPhase] = useState("");
  useEffect(() => {
      new Database();
      //Inciamos la tabla de detecciones de la base de datos
      setLoadPhase("DetectionsTable");
      DetectionsTable.initTable().then(_=>{
        //Inciamos la tabla de trazados para el monitoreo
        setLoadPhase("MonitorDrawingsTable");
        MonitorDrawingsTable.initTable().then(_=>{
          //Iniciamos el motor de text-to-speech
          setLoadPhase("TtsVoices");
          startTtsVoice().then(_=>{
            //Inicializamos el detector de objetos al iniciar la app
            setLoadPhase("ObjectDetection");
            ObjectDetection.initializeDetector(OBJECT_DETECTOR_MAX_RESULTS, OBJECT_DETECTOR_SCORE_THRESHOLD)
            .then(_=>{
              //Inicializamos el modelo de reconocimiento de dictado por voz
              setLoadPhase("VoskSTT");
              vosk
                .loadModel('model-es-es')
                .then(_ => setInitialized(true))
                .catch((e) => console.error(e));
            })
            .catch((err)=>{
              console.log("Error initializing object detection model", err);
            });
          });
        })
      })
      
  
  }, []);
  if(!initialized){

    return <View style={{flex:1,backgroundColor:"#091520", justifyContent:"center", alignItems:"center",position:"absolute", top:0, left:0, right:0, bottom:0}}>
      <Text style={{color:"white", position:"absolute", top:"50%", width:"100%", textAlign:"center", fontSize:26}}>Cargando... {loadPhase}</Text>
    </View>
  }
  return <CamScan/>
}