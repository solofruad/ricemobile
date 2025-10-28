import React, { useEffect, useRef, useState } from 'react';
import { Camera,  useCameraDevices} from 'react-native-vision-camera';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { StyleSheet, View, Text, Button, Dimensions} from 'react-native';
import {Image as ImageRes} from 'react-native';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import {
  RNMLKitObjectDetectionObject,
  useObjectDetection,
} from "@infinitered/react-native-mlkit-object-detection";
import type { MyModelsConfig } from "../_layout";
import { Canvas, Rect, Image, Skia, SkImage, Group,  Line, vec, matchFont, Text as TextDraw, Circle } from '@shopify/react-native-skia';
import RNFS from 'react-native-fs';
import { writeAsync, readAsync, ExifTags } from '@lodev09/react-native-exify';

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

type ScanLabelsProps = {
  rects: RNMLKitObjectDetectionObject[],
  scale: number
  imageDims: {width:number, height:number}
}

const ScanLabels = (props: ScanLabelsProps)=>{
  const fontStyle = {
    fontFamily: "arial",
    fontWeight: "bold",
    fontSize: 16
  } as const;
  const font = matchFont(fontStyle);

  return props.rects.map((obj)=>{
    const x= obj.frame.origin.x * props.scale ;
    const y= obj.frame.origin.y * props.scale ;

    const width = obj.frame.size.x * props.scale;
    const height = obj.frame.size.y * props.scale;

    const point = rotatePointAroundPlaneCenter({x,y},{width:props.imageDims.width,height:props.imageDims.width},90);
    return <>
      <TextDraw
        text={obj.labels.map(e=>{return `${e.text}: ${e.confidence.toFixed(2)}`}).join(", ")}
        font={font}
        x={point.x-height}
        y={point.y}
        />
        {/* <Circle cx={point.x} cy={point.y} r={5} color="lightblue" /> */}
    </>
  })
}

type ScanRectsProps = {
  rects: RNMLKitObjectDetectionObject[],
  scale: number
}

const ScanRects = (props: ScanRectsProps)=>{
  return props.rects.map((obj)=>{
    const x= obj.frame.origin.x * props.scale ;//-70
    const y= obj.frame.origin.y * props.scale ;//+70
    const xEnd = obj.frame.size.x * props.scale +x;
    const yEnd= obj.frame.size.y * props.scale +y;
    return <>
      <Line
        p1={vec(x, y)}
        p2={vec(xEnd, y)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
      <Line
        p1={vec(xEnd, y)}
        p2={vec(xEnd, yEnd)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
      <Line
        p1={vec(xEnd, yEnd)}
        p2={vec(x, yEnd)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
      <Line
        p1={vec(x, yEnd)}
        p2={vec(x, y)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
    </>
  })
}

type ScanCanvasProps = {
  detection: RNMLKitObjectDetectionObject[],
  photoUri: string
  deleteData: ()=>void
}

function rotatePointAroundPlaneCenter(
  point: {x:number,y:number},
  plane: {width:number,height:number},
  angleDegrees: number
): {x:number,y:number} {
  // Calculate plane center
  const cx = plane.width / 2;
  const cy = plane.height / 2;

  // Convert angle to radians
  const rad = (angleDegrees * Math.PI) / 180;

  // Translate point to origin
  const tx = point.x - cx;
  const ty = point.y - cy;

  // Apply rotation
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = tx * cos - ty * sin;
  const ry = tx * sin + ty * cos;

  // Translate back
  return {
    x: rx + cx,
    y: ry + cy
  };
}

const ScanCanvas = (props: ScanCanvasProps)=>{
  const [image,setImage] = useState<SkImage|null>(null);
  const [scale,setScale] = useState(1);

  const [dims, setDims] = useState<{x:number,y:number}|null>(null);

  
  useEffect(()=>{
    const screen = Dimensions.get("screen");
    Skia.Data.fromURI(props.photoUri).then((skData)=>{
      const skImage = Skia.Image.MakeImageFromEncoded(skData) as SkImage;
      const scaleB = screen.width / skImage.height()
      setScale(scaleB); 
      setDims({
        x: skImage.height()*scaleB,
        y: skImage.width()*scaleB 
      });
      setImage(skImage);


    })
  },[])

  return  <View style={{position:"absolute", width:"100%", height:"100%", backgroundColor:"orange", bottom:0}}>
    <Button title='Exit' onPress={()=>{props.deleteData(); setImage(null); setScale(1);}}/>
    {(image && dims && scale) ? <Canvas style={{width:dims.x, height:dims.y, backgroundColor:"black"}}>
       <Group 
        transform={[{rotate:(90 *Math.PI)/180},{scale:1}]} 
        origin={{x:(dims.x)*(0.5),y:(dims.x)*0.5}}>
          <Image width={dims.y} height={dims.x} image={image}/>
          <ScanRects rects={props.detection} scale={scale}/>
      </Group>
      <ScanLabels 
        rects={props.detection} 
        imageDims={{width:dims.x,height:dims.y}} 
        scale={scale}/>
      <Circle cx={(dims.x)/2} cy={(dims.y)/2} r={5} color="lightblue" />
    </Canvas> : null}
  </View> 
}

const CamScan = () => {
  const [camIndex, setCamIndex] = useState(0);
  const [detection, setDetection] = useState<RNMLKitObjectDetectionObject[] | null>(null);
  const [photoUri, setPhotoUri] = useState('');

  
  const detector = useObjectDetection<MyModelsConfig>("furnitureDetector");

  const devices = useCameraDevices()
  const camera = useRef(null);
  // console.log(require("../../assets/models/eh.jpg"));
  // console.log(ImageRes);
  // console.log(RNFS.ExternalDirectoryPath );

    
          
  const requestPermission = async () => {
    const newCameraPermission = await Camera.requestCameraPermission();
      // ... handle permission result
    };
  // You must handle permissions!
  useEffect(() => { 
    requestPermission();
  }, []);

  const detectAndSetUri = (uri:string)=>{
    detector!.detectObjects(uri).then((res)=>{
      setDetection(res);
      setPhotoUri(uri);
    });
  }

  const takePicture = async () => {
    if (camera.current) {
      (camera.current as Camera).takePhoto({}).then((photo)=>{
        // const uri = `file:///storage/emulated/0/Android/data/com.anonymous.myapp/files/eh.jpg`;
        var uri = `file://${photo.path}`
        // const uri = ImageRes.resolveAssetSource(require("../../assets/models/eh.jpg")).uri;
        writeAsync(uri,{Orientation:0}).then(()=>{
          readAsync(uri).then(res=>{
          //   console.log(res?.Orientation)
            // const rotation = 0;
          //   // if (rotation !== 0) {
              // ImageResizer.createResizedImage(
              //   uri,
              //   photo.width,
              //   photo.height,
              //   'JPEG',
              //   100,
              //   rotation,
              //   undefined,
              //   false,
              //   { mode: 'contain', onlyScaleDown: false }
              // ).then((rotatedImage)=>{
              //   // console.log("here",rotatedImage);
              //   detectAndSetUri(rotatedImage.uri);
              //   readAsync(rotatedImage.uri).then(res=>{console.log(res)});
              // })

              
            // }else{
              detectAndSetUri(uri);
            // }
            window.alert("Captura realizada");

          });
          
        })

        
        // setDetectedObjects(detectionResults);
        // CameraRoll.saveAsset(`file://${photo.path}`, {
        //   type: 'photo',
        // })
      });
    }
  };

  if (devices == null) return <View><Text>No camera device</Text></View>;
  return (
    <View style={{paddingTop:30,width:"100%",height:"100%", display:"flex", gap:8, position:"relative"}}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={devices[camIndex]}
        isActive={true}
        resizeMode={'contain'}
        photo={true}
        photoQualityBalance={"quality"}
        outputOrientation='preview'
      />
      
      <CamSelector cameraCount={devices.length} setCamIndex={(idx: number)=>{setCamIndex(idx);}}/> 

      <View style={{ display:"flex", gap:10}}>
        <Button onPress={takePicture} title="Fotito y pal foro"/>
      </View>
      
      {detection && photoUri ? <ScanCanvas detection={detection} photoUri={photoUri} deleteData={()=>{setDetection(null); setPhotoUri('');}}/> : null}
      {/* <Text style={{color:"white",fontSize:24}}>{label}</Text> */}
    </View>
  );
};

export default CamScan;
