import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, CameraController, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';

import { writeAsync } from '@lodev09/react-native-exify';

import { ObjectDetection, ObjectDetectionResult } from '@/src/ObjectDetection';
import { IconButton, MD3Colors } from "react-native-paper";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CameraPermisionUI from './CameraPermisionUI';
import ScanControledCanvas from './ScanControledCanvas';
import TopToolbar from './TopToolbar';

type CameraSafeAreaProps = {
  children: any
}

type CamScanProps = {
  onResult?: (result: { photo_dir: string; detection: ObjectDetectionResult[] }) => void;
  onClose?: () => void;
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

export default function CamScan({ onResult, onClose }: CamScanProps) {
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
    if (!camera.current) return;
    try {
      setIsTakingPhoto(true);
      const photo = await photoOutput.capturePhotoToFile({
        enableShutterSound: false,
        enableRedEyeReduction: false,
      }, {
        onDidCapturePhoto: () => {}
      });
      const uri = `file://${photo.filePath}`;
      setIsTakingPhoto(false);
      setIsDetecting(true);
      await writeAsync(uri, { Orientation: 1 });
      detectAndSetPhotoRoute(uri);
    } catch (e) {
      console.error("Error al capturar:", e);
      setIsTakingPhoto(false);
    }
  };

  const handleResult = (result: { photo_dir: string; detection: ObjectDetectionResult[] }) => {
    setDetection(null);
    setPhotoUri('');
    onResult?.(result);
    onClose?.();
  };

  const handleCancel = () => {
    setDetection(null);
    setPhotoUri('');
    onClose?.();
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
                    backgroundColor: "#fffeef",
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
                iconColor="rgb(87, 87, 87)"
                containerColor="rgb(255, 255, 255)"
                size={35} 
                style={{ marginHorizontal: "auto", 
                        width: 75, // Custom outer button width
                        height: 75, // Custom outer button height
                        borderRadius: 45,
                        alignItems: 'center',
                        borderWidth: 3, // Border thickness
                        borderColor: '#6a6a6a90', // Border color
                 }}/>
            </View>

            <TopToolbar 
              onShow={() => { 
                (camera.current?.controller as CameraController).setZoom(2); 
              }}
              onHide={() => { 
                (camera.current?.controller as CameraController).setZoom(1); 
              }}
              minFocusDistance={minFocusDistance} 
              setFocusDepth={(n) => {
                (camera.current?.controller as CameraController).setFocusLocked?.(n).catch((e:any) => console.log("Focus lock error:", e));
              }}
            />
          </>
        ) : null}

        {(isDetecting || isTakingPhoto) && (
          <View style={[styles.overlay, { backgroundColor: isTakingPhoto ? "rgba(0,0,0,0.5)" : "#363636" }]}>
            <Text style={styles.overlayText}>
              {isTakingPhoto ? "Tomando Fotografía..." : "Analizando Fotografía..."}
            </Text>
          </View>
        )}

        {detection && photoUri && (
          <ScanControledCanvas 
            detection={detection} 
            photoUri={photoUri} 
            deleteData={() => { setDetection(null); setPhotoUri(''); }}
            onSaveResult={onResult ? handleResult : undefined}
            onCancel={handleCancel}/> 
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