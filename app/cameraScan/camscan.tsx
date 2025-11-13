import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Camera, useCameraDevices } from 'react-native-vision-camera';

import {
  RNMLKitObjectDetectionObject,
  useObjectDetection,
} from "@infinitered/react-native-mlkit-object-detection";
import { writeAsync } from '@lodev09/react-native-exify';
import { runOnJS } from 'react-native-worklets';
import type { MyModelsConfig } from "../_layout";

import { IconButton, MD3DarkTheme } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ScanCanvas from './ScanCanvas';
import TopToolbar from './TopToolbar';


const CamScan = () => {
  const [camIndex, setCamIndex] = useState(0);
  const [detection, setDetection] = useState<RNMLKitObjectDetectionObject[] | null>(null);
  const [minFocusDistance,setMinFocusDistance] = useState(0.0001);
  const [photoUri, setPhotoUri] = useState('');

  const [isDetecting,setIsDetecting] = useState(false);

  const detector = useObjectDetection<MyModelsConfig>("furnitureDetector");

  const devices = useCameraDevices()
  const camera = useRef(null);
          
  const requestPermission = async () => {
    const newCameraPermission = await Camera.requestCameraPermission();
    if(newCameraPermission == "denied"){
      await Camera.requestCameraPermission();
    }
      // ... handle permission result
  };
  useEffect(() => { 
    requestPermission().then(()=>{
      setMinFocusDistance(devices[camIndex].minFocusDistance * 1.5);
    });
  }, []);

  const detectAndSetUri = (uri:string)=>{
    detector!.detectObjects(uri).then((res)=>{
      setDetection(res);
      setPhotoUri(uri);
      setIsDetecting(false);
    });
  }

  const takePicture = async () => {
    if (camera.current) {
      setIsDetecting(true);
      (camera.current as Camera).takePhoto({}).then((photo)=>{
        var uri = `file://${photo.path}`
        writeAsync(uri,{Orientation:0}).then(()=>{
          detectAndSetUri(uri);
        });
        // setDetectedObjects(detectionResults);
        // CameraRoll.saveAsset(`file://${photo.path}`, {
        //   type: 'photo',
        // });
      });
    }
  };

  const focus = (point: {x:number, y:number}) => {
    const c = camera.current as unknown as Camera;
    if (c == null) {return}
    try {
      c.focus(point).catch(()=>{});  
    } catch (error) {
      
    }
    
  }

  const gesture = Gesture.Tap()
    .onEnd(({ x, y }) => {
      //?El ident aconseja usar "scheduleOnRN()" en su lugar, pero dicho metodo internamente emplea "runOnJS()"... bruh
      try {
              runOnJS(focus)({ x, y })
      } catch (error) {
        
      }

    });
  if (devices == null) return <View><Text>No camera device</Text></View>;
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{width:"100%",height:"100%", display:"flex", gap:8, position:"relative" }}>
        {!(detection && photoUri) ? <>
          <GestureHandlerRootView>
            <GestureDetector gesture={gesture}>
              <Camera
                ref={camera}
                style={[StyleSheet.absoluteFill,{ backgroundColor:"#206758ff"}]}
                device={devices[camIndex]}
                isActive={true}
                resizeMode={'contain'}
                photo={true}
                photoQualityBalance={"quality"}
                outputOrientation='preview'
                enableLocation={false}
                focusable={false}
              />
            </GestureDetector>
          </GestureHandlerRootView>

          <View style={{ display:"flex", gap:10, flexDirection:"row", position:"absolute", bottom:0, width:"100%"}}>
            <IconButton icon={"camera"} onPress={takePicture} mode='outlined' theme={MD3DarkTheme} size={50} style={{marginHorizontal:"auto"}}/>
          </View>
          <TopToolbar 
            minFocusDistance={minFocusDistance} 
            setFocusDepth={(n)=>{(camera.current as unknown as Camera).focusDepth(n);}}
            />
        </>
        :null}
        {isDetecting ? 
          <View style={{width:"100%",height:"100%",backgroundColor:"#363636ff"}}>
            <Text style={{color:"white", fontSize:32, marginHorizontal:"auto",marginVertical:"auto"}}>
              Analizando Fotografía
            </Text>
            
          </View>
          :null}
        {detection && photoUri ? 
          <ScanCanvas 
            detection={detection} 
            photoUri={photoUri} 
            deleteData={()=>{setDetection(null); setPhotoUri('');}}/> 
        : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};



export default CamScan;
