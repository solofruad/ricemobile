import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { ObjectDetection } from '../../src/ObjectDetection';
import CamScan from '../cameraScan/CamScan';
import Database from '@/database/db';

export default function HomeScreen() {
  const [initialized, setInitialized] = useState(false);  
  useEffect(() => {
      new Database();
      //Inicializamos el detector de objetos al iniciar la app
      ObjectDetection.initializeDetector(7, 0.2)
      .then(()=>{
        setInitialized(true);
      }).catch((err)=>{
        console.log("Error initializing object detection model", err);
      })
  }, []);
  if(!initialized){
    return <Text style={{color:"white"}}>Initializing object detection model...</Text>
  }
  return <CamScan/>
}