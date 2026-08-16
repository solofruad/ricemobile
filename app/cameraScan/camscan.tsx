import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, CameraController, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';

import { writeAsync } from '@lodev09/react-native-exify';

import { ObjectDetection, ObjectDetectionResult } from '@/src/ObjectDetection';
import { CameraFocusInfo } from '@/src/CameraFocusInfo';
import { IconButton, MD3Colors } from "react-native-paper";
import { SafeAreaProvider,  useSafeAreaInsets } from 'react-native-safe-area-context';
import CameraPermisionUI from './camUtilities/CameraPermisionUI';
import ScanControledCanvas from './ScanControledCanvas';
import TopToolbar from './TopToolbar';

const MIN_FOCUS_DISTANCE = 15;

type CamScanProps = {
  onResult?: (result: { photo_dir: string; detection: ObjectDetectionResult[] }) => void;
  onClose?: () => void;
}

export default function CamScan({ onResult, onClose }: CamScanProps) {
  const insets = useSafeAreaInsets();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [timesPermissionRejected, setTimesPermissionRejected] = useState(0);
  const [detection, setDetection] = useState<ObjectDetectionResult[] | null>(null);
  const [minFocusDistance, setMinFocusDistance] = useState(MIN_FOCUS_DISTANCE);
  const [showFocusControl, setShowFocusControl] = useState(false);
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
    CameraFocusInfo.getMinFocusDistance().then((diopters: number | null) => {
      if (typeof diopters === "number" && diopters > 0) {
        //Por 1.3 para intentar forzar un poco más el enfoque, ya que la cámara puede estar descalibrada.
        setMinFocusDistance(diopters*1.3); 
      }
    });
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
    if(showFocusControl) {
      (camera.current.controller as CameraController).setZoom(1);
    }

    window.setTimeout(async () => {
      try {
        setIsTakingPhoto(true);
        const photo = await photoOutput.capturePhotoToFile({
          enableShutterSound: false,
          enableRedEyeReduction: false,
        }, {
          onDidCapturePhoto: () => {}
        });
        if(showFocusControl) {
          (camera.current.controller as CameraController).setZoom(1);
        }
        const uri = `file://${photo.filePath}`;
        setIsTakingPhoto(false);
        setIsDetecting(true);
        await writeAsync(uri, { Orientation: 1 });
        detectAndSetPhotoRoute(uri);
      } catch (e) {
        console.error("Error al capturar:", e);
        setIsTakingPhoto(false);
      }

    },showFocusControl ? 1000 : 0);
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
    <SafeAreaProvider>
      <View style={{ flex: 1, position: "relative", backgroundColor: "#091520" }}>
          <View style={[styles.stageLayer, { }]}>
                <Camera
                  ref={camera}
                  style={styles.camera}
                  device={device}
                  isActive={!(detection && photoUri) && hasPermission}
                  resizeMode='contain'
                  outputs={[photoOutput]}
                  orientationSource='interface'
                />

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
                setShowFocusControl(true);
                (camera.current?.controller as CameraController).setZoom(2); 
              }}
              onHide={() => { 
                setShowFocusControl(false);
                (camera.current?.controller as CameraController).setZoom(1); 
              }}
              minFocusDistance={minFocusDistance} 
              setFocusDepth={(n) => {
                (camera.current?.controller as CameraController).setFocusLocked?.(n).catch((e:any) => console.log("Focus lock error:", e));
              }}
            />
          </View>

        {(isDetecting || isTakingPhoto) && (
          <View style={[styles.stageLayer, {
            top: insets.top,
            backgroundColor: isTakingPhoto ? "rgba(255, 255, 255, 0.65)" : "#fffeef"
          }]}>
            <Text style={styles.overlayText}>
              {isTakingPhoto ? "Tomando Fotografía..." : "Analizando Fotografía..."}
            </Text>
          </View>
        )}

        {detection && photoUri && (
          <View style={[styles.stageLayer, { top: insets.top,backgroundColor: "#fffeef" }]}>
            <ScanControledCanvas 
              detection={detection} 
              photoUri={photoUri} 
              deleteData={() => { setDetection(null); setPhotoUri(''); }}
              onSaveResult={onResult ? handleResult : undefined}
              onCancel={handleCancel}/> 
          </View>
        )}

      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
  stageLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  camera: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  buttonContainer: { position: "absolute", bottom: 10, width: "100%", flexDirection: "row" },
  overlayText: { color: MD3Colors.neutral30, fontSize: 24, fontWeight: 'bold' }
});