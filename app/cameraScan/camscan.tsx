import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, CameraController, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';

import { writeAsync } from '@lodev09/react-native-exify';

import { IconButton, MD3Colors, MD3DarkTheme } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ScanControledCanvas from './ScanControledCanvas';
import TopToolbar from './TopToolbar';
import CameraPermisionUI from './CameraPermisionUI';
import { ObjectDetectionResult } from '@/types/types';
import { ObjectDetection } from '@/src/ObjectDetection';

type CameraSafeAreaProps = {
  children: any
}

function CameraSafeArea({children}: CameraSafeAreaProps) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, gap: 8, position: "relative", backgroundColor: "#091520"}}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function CamScan() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [timesPermissionRejected, setTimesPermissionRejected] = useState(0);
  const [detection, setDetection] = useState<ObjectDetectionResult[] | null>(null);
  const [minFocusDistance, setMinFocusDistance] = useState(10);
  const [photoUri, setPhotoUri] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const { hasPermission, requestPermission: askPermission } = useCameraPermission();
  
  const device = useCameraDevice('back');
  const photoOutput = usePhotoOutput()
  //@ts-ignore
  const camera = useRef<CameraRef>(null);

  const handleRequestPermission = async (attempts = 1) => {
    const isGranted = await askPermission();
    if (isGranted) {
      setPermissionGranted(true);
      setTimesPermissionRejected(0);
    } else {
      setTimesPermissionRejected(prev => prev + 1);
      if (attempts < 2) handleRequestPermission(attempts + 1);
    }
  };

  useEffect(() => {
    handleRequestPermission();
  }, []);

  const detectAndSetPhotoRoute = (uri: string) => {
    ObjectDetection.detectObjects(uri)
      //@ts-ignore
      .then((res: Array<{ label: string, confidence: number }>) => {
        setDetection(res as any);
        setPhotoUri(uri);
        setIsDetecting(false);
      });
  }

  const takePicture = async () => {
    if (camera) {
      try {
        setIsTakingPhoto(true);
        photoOutput.capturePhotoToFile({
          enableShutterSound: false,
          enableRedEyeReduction: false,
        },{
          onDidCapturePhoto:()=>{

          }
        }).then((photo) => {
          const uri = `file://${photo.filePath}`;
          console.log("Foto capturada en:", uri);
          setIsTakingPhoto(false);
          setIsDetecting(true);
          writeAsync(uri, { Orientation: 1 })
            .then(() => {
              detectAndSetPhotoRoute(uri);
            });
        })
      } catch (e) {
        console.error("Error al capturar:", e);
        setIsTakingPhoto(false);
      }
    }
  };


  if (!hasPermission && timesPermissionRejected >= 1) {
    return <CameraPermisionUI 
              permissionGranted={permissionGranted} 
              timesPermissionRejected={timesPermissionRejected} 
              //@ts-ignore
              requestPermission={handleRequestPermission}/>
  }
  
  if (!device) return (
    <View style={styles.center}>
      <Text style={{ color: "white" }}>Buscando dispositivo de cámara...</Text>
    </View>
  );

  return (
    <CameraSafeArea>
        {!(detection && photoUri) ? (
          <>
            
            <View style={{ flex: 1}}>
                <Camera
                  ref={camera}
                  style={{ 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    top: 0,
                    backgroundColor: "#091520",
                    position: "absolute" }}
                  device={device}
                  isActive={true}
                  resizeMode='contain'
                  outputs={[photoOutput]}
                  orientationSource='interface'
                />
            </View>

            <View style={styles.buttonContainer}>
              <IconButton 
                icon="camera" 
                onPress={takePicture} 
                mode='contained' 
                iconColor={MD3Colors.neutral40}
                size={50} 
                style={{ marginHorizontal: "auto" }}/>
            </View>

            <TopToolbar 
              onShow={() => { 
                let controller = camera.current.controller as CameraController;
                controller.setZoom(2); 
              }}
              onHide={() => { 
                let controller = camera.current.controller as CameraController;
                controller.setZoom(1); 
              }}
              minFocusDistance={minFocusDistance} 
              setFocusDepth={(n) => {
                let controller = camera.current.controller as CameraController;
                controller.setFocusLocked?.(n).catch((e:any) => console.log("Focus lock error:", e));
                console.log("Ajustando distancia focal a:", n);
              }}
            />
          </>
        ) : null}

        {(isDetecting || isTakingPhoto) && (
          <View style={[styles.overlay, { backgroundColor: isTakingPhoto ? "rgba(0,0,0,0.5)" : "#363636" }]}>
            <Text style={styles.overlayText}>
              {isTakingPhoto ? "Tomando Foto" : "Analizando Fotografía"}
            </Text>
          </View>
        )}

        {detection && photoUri && (
          <ScanControledCanvas 
            detection={detection} 
            photoUri={photoUri} 
            deleteData={() => { setDetection(null); setPhotoUri(''); }}/> 
        )}
      </CameraSafeArea>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
  buttonContainer: { position: "absolute", bottom: 10, width: "100%", flexDirection: "row" },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  overlayText: { color: "white", fontSize: 24, fontWeight: 'bold' }
});