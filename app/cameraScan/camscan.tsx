import { useEffect, useRef, useState } from 'react';
import { NativeModules, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';

import { writeAsync } from '@lodev09/react-native-exify';
import { runOnJS } from 'react-native-worklets';

import { IconButton, MD3DarkTheme } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ScanControledCanvas from './ScanControledCanvas';
import TopToolbar from './TopToolbar';
import CameraPermisionUI from './CameraPermisionUI';
import { ObjectDetectionResult } from '@/types/types';
const { ObjectDetectionModule } = NativeModules;

import Reanimated, { useSharedValue, useAnimatedProps } from 'react-native-reanimated';

const ReanimatedCamera = Reanimated.createAnimatedComponent(Camera);

type CameraSafeAreaProps = {
  children: any
}

function CameraSafeArea({children}:CameraSafeAreaProps) {
  return <SafeAreaProvider>
          <SafeAreaView style={{width:"100%",height:"100%", display:"flex", gap:8, position:"relative" }}>
            {children}
          </SafeAreaView>
        </SafeAreaProvider>
}

export default function CamScan () {
  const [permissionGranted,setPermissionGranted] = useState(false);
  const [timesPermissionRejected, setTimesPermissionRejected] = useState(0);
  const [detection, setDetection] = useState<ObjectDetectionResult[] | null>(null);
  const [minFocusDistance,setMinFocusDistance] = useState(0.01);
  const [photoUri, setPhotoUri] = useState('');
  const [isDetecting,setIsDetecting] = useState(false);
  const [isTakingPhoto,setIsTakingPhoto] = useState(false);
  // const [zoom, setZoom] = useState(1)

  const { hasPermission } = useCameraPermission()

  const devices = useCameraDevices()
  const camera = useRef(null);

  const zoom = useSharedValue(1);
  const animatedProps = useAnimatedProps(
    () => ({
      zoom: zoom.value,
    }),
    [zoom]
  );

  const requestPermission = (requestions = 1)=>{
    return new Promise((resolve)=>{
      Camera.requestCameraPermission()
        .then((cameraPermission)=>{
          console.log(cameraPermission, requestions);
          if(cameraPermission != "granted"){
            setTimesPermissionRejected(timesPermissionRejected +1);
            //Se puede denegar 2 veces el permiso a camara, luego la petición
            //será rechazado automaticamente por el dispositivo
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
            console.log("Device focal distance",devices[0].minFocusDistance);
            setMinFocusDistance(devices[0].minFocusDistance *1.5 || 15);
            resolve(true);
          }
      }).catch((err)=>{console.log(err);})
    }) as Promise<boolean>
  }

  useEffect(() => { 
    requestPermission(1);
  }, []);

  const detectAndSetPhotoRoute = (uri:string)=>{
    ObjectDetectionModule.detectObjects(uri)
    .then((res:Array<{label: string, confidence: number}>)=>{
      //@ts-ignore
      setDetection(res);
      setPhotoUri(uri);
      setIsDetecting(false);
    });
  }

  const takePicture = async () => {
    if (camera.current) {
      setIsTakingPhoto(true);
      (camera.current as Camera).takePhoto().then((photo)=>{
        setIsTakingPhoto(false);
        var uri = `file://${photo.path}`;
        setIsDetecting(true);
        //*PARA FORZAR A QUE TODAS LAS IMAGENES TENGAN LA MISMA ORIENTACION
        writeAsync(uri,{Orientation:1}).then(()=>{
          detectAndSetPhotoRoute(uri);
        });
      });
    }
  };

  //Permite conservar el ajuste de contraste automatico, dado que el enfoque automatico 
  // controla el punto focal y el ajuste del contraste (tiempo de )
  const focus = (point: {x:number, y:number}) => {
    const c = camera.current as unknown as Camera;
    if (c == null) {return}
    try {
      c.focus(point).catch(()=>{});  
    } catch (error) {}
  }

  const gesture = Gesture.Tap()
    .onEnd(({ x, y }) => {
      //?El ident aconseja usar "scheduleOnRN()" en su lugar, pero dicho metodo internamente emplea "runOnJS()"... bruh
      try {
        runOnJS(focus)({ x, y });
      } catch (error) { }
    });

  if(!permissionGranted && timesPermissionRejected >= 1){
    return <CameraPermisionUI 
              permissionGranted={permissionGranted} 
              timesPermissionRejected={timesPermissionRejected} 
              requestPermission={requestPermission}/>
  }
  
  if (devices.length == 0) return <View style={{height:"100%"}}>
    <Text style={{color:"white", marginHorizontal:"auto", marginVertical:"auto"}}>
      No camera device
    </Text>
  </View>;

  if (hasPermission) return (
    <CameraSafeArea>
        {!(detection && photoUri) ? <>
          <GestureHandlerRootView>
            <GestureDetector gesture={gesture}>
              <ReanimatedCamera
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
                animatedProps={animatedProps}
              />
            </GestureDetector>
          </GestureHandlerRootView>

          <View style={{ display:"flex", gap:10, flexDirection:"row", position:"absolute", bottom:0, width:"100%"}}>
            <IconButton 
              icon={"camera"} 
              onPress={takePicture} 
              mode='outlined' 
              theme={MD3DarkTheme} 
              size={50} 
              style={{marginHorizontal:"auto"}}/>
          </View>
          <TopToolbar 
            onShow={()=>{zoom.value = 2}}
            onHide={()=>{zoom.value = 1}}
            minFocusDistance={minFocusDistance} 
            //@ts-ignore
            setFocusDepth={ n =>{(camera.current as unknown as Camera).focusDepth(n);} }
            />
        </>
        :null}
        {isDetecting || isTakingPhoto ? 
          <View style={{width:"100%",height:"100%",position:"absolute",bottom:0,backgroundColor:(isTakingPhoto? "rgba(54, 54, 54, 0.75)" : "#363636ff")}}>
            <Text style={{color:"white", fontSize:32, marginHorizontal:"auto",marginVertical:"auto"}}>
              {isTakingPhoto ? "Tomando Foto" : "Analizando Fotografía"}
            </Text>
          </View>
          :null}
        {detection && photoUri ? 
          <ScanControledCanvas 
            detection={detection} 
            photoUri={photoUri} 
            deleteData={()=>{setDetection(null); setPhotoUri('');}}/> 
        : null}
      </CameraSafeArea>
  );
};