import { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';

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
import PermissionModal from './PermissionModal';

const CamScan = () => {
  const [permissionGranted,setPermissionGranted] = useState(false);
  const [timesPermissionRejected, setTimesPermissionRejected] = useState(0);
  const [detection, setDetection] = useState<RNMLKitObjectDetectionObject[] | null>(null);
  const [minFocusDistance,setMinFocusDistance] = useState(0.0001);
  const [photoUri, setPhotoUri] = useState('');

  const [isDetecting,setIsDetecting] = useState(false);

  const { hasPermission } = useCameraPermission()

  const detector = useObjectDetection<MyModelsConfig>("furnitureDetector");

  const devices = useCameraDevices()
  const camera = useRef(null);


  const requestPermission = (requestions = 1)=>{
    return new Promise((resolve)=>{
      Camera.requestCameraPermission().then((cameraPermission)=>{
        console.log(cameraPermission);
        if(cameraPermission != "granted"){
          setTimesPermissionRejected(timesPermissionRejected +1);
          //Se puede denegar 2 veces el permiso a camara, luego el permiso
          //será rechazado automaticamente
          if(requestions > 2){
            resolve(false);
            return
          }else{
            setPermissionGranted(false);        
            requestPermission(requestions+1).then(res=>{
              resolve(res);
            });
          }
        }else{
          setTimesPermissionRejected(0)
          setPermissionGranted(true);
          resolve(true);
        }
      })
    }) as Promise<boolean>
  }

  useEffect(() => { 
    requestPermission().then((res)=>{
      if(!res) {return}
      setMinFocusDistance(devices[0].minFocusDistance || 15);
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

  const [switcher,setSwitcher] = useState(true);
  if(!permissionGranted && timesPermissionRejected >= 1){
    return <View style={{height:"100%", backgroundColor:"gray",alignContent:"center", justifyContent:"center",gap:25}}>
              <PermissionModal visible={switcher}/>
      <Text style={{maxWidth:"70%",marginHorizontal:"auto",textAlign:"center", color:"white",fontSize:20}}>Actualmente, no se tiene permiso para el uso de la camara del dispositivo</Text>
      <View style={{marginHorizontal:"auto"}}>
        <Button title="Comprobar Permiso" onPress={()=>{requestPermission(2).then(res=>{if(!res){setSwitcher(!switcher)}})}} />
      </View>
    </View>;
  }
  
  if (devices == null) return <View style={{height:"100%"}}><Text style={{color:"white",marginHorizontal:"auto",marginVertical:"auto"}}>No camera device</Text></View>;
  if (hasPermission) return (
    <SafeAreaProvider>
      <SafeAreaView style={{width:"100%",height:"100%", display:"flex", gap:8, position:"relative" }}>
        {!(detection && photoUri) ? <>
          <GestureHandlerRootView>
            <GestureDetector gesture={gesture}>
              <Camera
                ref={camera}
                style={[StyleSheet.absoluteFill,{ backgroundColor:"#206758ff"}]}
                device={devices[0]}
                isActive={true}
                resizeMode={'contain'}
                photo={true}
                photoQualityBalance={"quality"}
                outputOrientation='preview'
                enableLocation={false}
                focusable={true}
              />
            </GestureDetector>
          </GestureHandlerRootView>

          <View style={{ display:"flex", gap:10, flexDirection:"row", position:"absolute", bottom:0, width:"100%"}}>
            <IconButton icon={"camera"} onPress={takePicture} mode='outlined' theme={MD3DarkTheme} size={50} style={{marginHorizontal:"auto"}}/>
          </View>
          <TopToolbar 
            minFocusDistance={minFocusDistance} 
            setFocusDepth={(n)=>{(camera.current as unknown as Camera).focusDepth(n); console.log(n)}}
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
