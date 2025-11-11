import { RNMLKitObjectDetectionObject } from "@infinitered/react-native-mlkit-object-detection"
import { Canvas, Group, Image, Skia, SkImage } from "@shopify/react-native-skia"
import { useEffect, useRef, useState } from "react"
import { Button, Dimensions, View, Text as ReactText } from "react-native"
import ScanLabels from "./ScanLabels";
import ScanRects from "./ScanRects";

type ScanCanvasProps = {
  detection: RNMLKitObjectDetectionObject[],
  photoUri: string
  deleteData: ()=>void
}

const ScanCanvas = (props: ScanCanvasProps)=>{
  const [image,setImage] = useState<SkImage|null>(null);
  const [scale,setScale] = useState(1);
  const [dims, setDims] = useState<{x:number,y:number}|null>(null);
  const canvasRef = useRef(null);

  
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
    }).then(()=>{
      // (canvasRef.current as unknown as CanvasRef)
    })
  },[])

  return  <View style={{position:"absolute", width:"100%", height:"100%", bottom:0, display:"flex"}}>
    <ReactText style={{color:"white", marginHorizontal:"auto", fontSize:24, marginVertical:"auto"}}>Resultados de Reconocimiento</ReactText>
    {(image && dims && scale) ?  
    <Canvas ref={canvasRef} style={{width:dims.x, height:dims.y, backgroundColor:"black", marginTop:"auto", marginBottom:"auto"}}>
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
    </Canvas> 
    : null}
    <View style={{display:"flex", flexDirection:"row", gap: 25, marginHorizontal:"auto"}}>
      <Button 
        title='Finalizar' 
        onPress={()=>{props.deleteData(); setImage(null); setScale(1);}}/>
    </View>
  </View> 
}

export default ScanCanvas;