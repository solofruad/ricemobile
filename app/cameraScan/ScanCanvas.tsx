import { RNMLKitObjectDetectionObject } from "@infinitered/react-native-mlkit-object-detection"
import { Canvas, Group, Image, Line, matchFont, Rect, Skia, SkImage, vec, Text as TextDraw, CanvasRef } from "@shopify/react-native-skia"
import { createRef, useEffect, useRef, useState } from "react"
import { Button, Dimensions, View, Text as ReactText } from "react-native"

const INCLUIR_RECONOCIMIENTOS_SIN_LABELS = false;

type ScanLabelsProps = {
  rects: RNMLKitObjectDetectionObject[],
  scale: number
  imageDims: {width:number, height:number}
}

type RenderLabelsData = {
  point:{x:number,y:number},
  height:number,
  text:string
}
const ScanLabels = (props: ScanLabelsProps)=>{
  const fontStyle = {
    fontFamily: "arial",
    fontWeight: "bold",
    fontSize: 14
  } as const;
  const font = matchFont(fontStyle);
  // if(props.rects.lenght == 0){return null}
  //const obj = props.rects[0]
  const data = props.rects.map((obj)=>{
    const x = obj.frame.origin.x * props.scale;
    const y = obj.frame.origin.y * props.scale ;
    return {
      point : rotatePointAroundPlaneCenter({x,y},{width:props.imageDims.width,height:props.imageDims.width},90),
      height : obj.frame.size.y * props.scale,
      // text : obj.labels.map(e=>{return `${e.text}: ${e.confidence.toFixed(2)}`}).join(", ");
      text: obj.labels?.map(e=>e.text)[0] || ""

    }
  });

  return (data != null) ? data.map((obj,id)=>{
    if(obj.text == ""){
      return null;
    }
    let y = obj.point.y;
    if(y-18 < 0){
      y = 18;
    }


    return <Group key={"ScanLabel"+id}>
      <Rect
        x={obj.point.x-obj.height-2}
        y={y-18}
        width={obj.height+4}
        height={18}
        color={"green"}
        key={"labelRect"+id}
      />
      <TextDraw
        text={obj.text}
        font={font}
        x={obj.point.x-obj.height+4}
        y={y-4}
        color={"white"}
        key={"labelText"+id}
        />
    </Group>
  }) : null
}

type ScanRectsProps = {
  rects: RNMLKitObjectDetectionObject[],
  scale: number
}

const ScanRects = (props: ScanRectsProps)=>{
  return props.rects.map((obj,id)=>{
    if(!INCLUIR_RECONOCIMIENTOS_SIN_LABELS && obj.labels.length == 0){
      return null;
    }
    // const id = performance.now()+Math.random();
    const x= obj.frame.origin.x * props.scale ;//-70
    const y= obj.frame.origin.y * props.scale ;//+70
    const xEnd = obj.frame.size.x * props.scale +x;
    const yEnd= obj.frame.size.y * props.scale +y;
    return <Group key={"rects"+id}>
      <Line
        key={"lineA"+id}
        p1={vec(x, y)}
        p2={vec(xEnd, y)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
      <Line
        key={"lineB"+id}
        p1={vec(xEnd, y)}
        p2={vec(xEnd, yEnd)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
      <Line
        key={"lineC"+id}
        p1={vec(xEnd, yEnd)}
        p2={vec(x, yEnd)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
      <Line
        key={"lineD"+id}
        p1={vec(x, yEnd)}
        p2={vec(x, y)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
    </Group>
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
      {/* <Button
        title='Guardar' 
        onPress={()=>{props.deleteData(); setImage(null); setScale(1);}}/> */}
    </View>
  </View> 
}

export default ScanCanvas;