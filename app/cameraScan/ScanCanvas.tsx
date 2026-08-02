import { Canvas, Group, Image, Skia, SkImage } from "@shopify/react-native-skia";
import { useEffect, useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import GestureHandler from "./GestureHandler";
import ScanLabels from "./ScanLabels";
import ScanRects from "./ScanRects";


import { ObjectDetectionResult } from '@/src/ObjectDetection';


type ScanCanvasProps = {
  detection?: ObjectDetectionResult[],
  photoUri: string
  useGestureHandler?: boolean
}

const ScanCanvas = (props: ScanCanvasProps)=>{
  const [image,setImage] = useState<SkImage|null>(null);
  const [scale,setScale] = useState(1);
  const [dims, setDims] = useState<{x:number,y:number}|null>(null);
  
  const canvasRef = useRef(null);

  useEffect(()=>{
    const screen = Dimensions.get("screen");
    Skia.Data.fromURI(props.photoUri).then( skData =>{
      const skImage = Skia.Image.MakeImageFromEncoded(skData) as SkImage;
      const scaleB = screen.width / skImage.height();
      setScale(scaleB); 
      setDims({
        x: skImage.height()*scaleB,
        y: skImage.width()*scaleB 
      });
      setImage(skImage);
    });
  },[]);

  const canvas = (image && dims) ?  
      <Canvas ref={canvasRef} style={{width:dims.x, height:dims.y, marginTop:"auto", marginBottom:"auto", position:"relative"}}>
          <Group 
            transform={[{rotate:(90 *Math.PI)/180}]} 
            origin={{x:dims.x*0.5,y:dims.x*0.5}}>
              <Image width={dims.y} height={dims.x} image={image}/>
              <ScanRects rects={props.detection} scale={scale}/>
          </Group>
          <ScanLabels 
            rects={props.detection} 
            imageDims={{width:dims.x,height:dims.y}} 
            scale={scale}/>
      </Canvas> 
    : null ;

  const canvasWithControls = (image && dims) ?  
    <GestureHandler size={{width:dims.x, height:dims.y,x:0,y:0}}>
      {(matrix) => 
        <Canvas ref={canvasRef} style={{width:dims.x, height:dims.y,  marginTop:"auto", marginBottom:"auto", position:"relative", backgroundColor:"#404e5c35"}}>
          <Group matrix={matrix}>
            <Group 
              transform={[{rotate:(90 *Math.PI)/180}]} 
              origin={{x:dims.x*0.5,y:dims.x*0.5}}>
                <Image width={dims.y} height={dims.x} image={image}/>
                <ScanRects rects={props.detection} scale={scale}/>
            </Group>
            <ScanLabels 
              rects={props.detection} 
              imageDims={{width:dims.x,height:dims.y}} 
              scale={scale}/>
          </Group>
        </Canvas>
      }
    </GestureHandler>
    : null ;


  return <View style={{flex:2, display:"flex",alignItems:"center"}}>
          {props.useGestureHandler ? canvasWithControls : canvas}
        </View>
}

export default ScanCanvas;