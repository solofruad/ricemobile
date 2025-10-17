import React, { useEffect, useRef, useState } from 'react';
import { Camera, runAsync, useCameraDevices, useFrameProcessor} from 'react-native-vision-camera';
import { StyleSheet, View, Text, Button } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useImageLabeler } from 'react-native-vision-camera-image-labeler';

type CamSelectorProps = {
  setCamIndex: (idx:number)=>void,
  cameraCount: number
}

const CamSelector = (props: CamSelectorProps)=> {
  return <View style={{position:"absolute",bottom:0,display:"flex",flexDirection:"row",gap:12}}>
    {
      [...new Array(props.cameraCount)].map((_,idx)=>(
        <Button 
          key={idx}
          onPress={() => {
            props.setCamIndex(idx);
          }}
          title={`Lente${idx+1}`}
        />
      ))
    }
  </View>
}

const App = () => {
  const [camIndex, setCamIndex] = useState(0);
  const devices = useCameraDevices()
  const camera = useRef(null);

  const requestPermission = async () => {
    const newCameraPermission = await Camera.requestCameraPermission();
      // ... handle permission result
    };
  // You must handle permissions!
  useEffect(() => { 
    requestPermission();
  }, []);

  // const {scanImage} = useImageLabeler({minConfidence : 1.0})
  const frameProcessor = useFrameProcessor((frame) => {
    // 'worklet'
    // runAsync(frame,()=>{
    //   // const data = scanImage(frame)
    // })

	// console.log(data, 'data')
  }, [])

  const takePicture = async () => {
    if (camera.current) {
      const photo = await (camera.current as Camera).takePhoto({
        
      });
      const res = await CameraRoll.saveAsset(`file://${photo.path}`, {
        type: 'photo',
      })
      console.log(res);
    }
  };

  if (devices == null) return <View><Text>No camera device</Text></View>;
  return (
    <View style={{width:"100%",height:"100%", display:"flex", gap:8}}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={devices[camIndex]}
        isActive={true}
        resizeMode={'contain'}
        photo={true}
        photoQualityBalance={"quality"}
        frameProcessor={frameProcessor}
      />
      
      <CamSelector cameraCount={devices.length} setCamIndex={(idx: number)=>{setCamIndex(idx);}}/> 

      <Button onPress={takePicture} title="Fotito y pal foro"/>
      <Button onPress={()=>{console.log(camera.current)}} title="Permiso"/>
    </View>
  );
};

export default App;
