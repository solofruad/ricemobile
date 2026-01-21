import { RNMLKitObjectDetectionObject } from "@infinitered/react-native-mlkit-object-detection"
import { Canvas, CanvasRef, Group, Image, ImageFormat, Skia, SkImage } from "@shopify/react-native-skia"
import { useEffect, useRef, useState } from "react"
import { Button, Dimensions, View, Text } from "react-native"
import ScanLabels from "./ScanLabels";
import ScanRects from "./ScanRects";
import GestureHandler from "./GestureHandler";

import * as FileSystem from 'expo-file-system';
import SaveModal from "./SaveModal";

type ScanCanvasProps = {
  detection: RNMLKitObjectDetectionObject[],
  photoUri: string
  deleteData: ()=>void
}

const ScanCanvas = (props: ScanCanvasProps)=>{
  const [image,setImage] = useState<SkImage|null>(null);
  const [scale,setScale] = useState(1);
  const [dims, setDims] = useState<{x:number,y:number}|null>(null);
  const [saved,setIsSaved] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
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

  let resetter: any;

  const canvas = (image && dims) ?  
    <GestureHandler size={{width:dims.x, height:dims.y,x:0,y:0}} reset={(f)=>{resetter = f;}}>
      <Canvas ref={canvasRef} style={{width:dims.x, height:dims.y, backgroundColor:"black", marginTop:"auto", marginBottom:"auto", position:"relative"}}>
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
    </GestureHandler>
    : null ;

  const save = ()=>{
    setIsSaved(true);
    (canvasRef.current as unknown as CanvasRef).makeImageSnapshotAsync()
      .then(res => res.encodeToBase64(ImageFormat.PNG,80))
      .then(base64String=>{
        //Comprobar que la carpeta para almacenar los scans exista
        const appDataDir = FileSystem.Paths.document.uri;
        const photoScansDir = `${appDataDir}photoScans/`;
        const dirInfo = new FileSystem.Directory(photoScansDir);
        if(!dirInfo.exists){
          if(dirInfo.createDirectory("photoScans").exists){
            throw new Error("El directorio 'photoScans' no logró ser creado");
          }
        }
        const tempPath = `${photoScansDir}saved_image_${Date.now()}.png`;
        (new FileSystem.File(tempPath)).write(base64String,{encoding:"base64"});
      }).then(()=>{
        setIsModalVisible(true);
      });
  }

  return <View style={{
      width:"100%", 
      height:"100%", 
      bottom:0, 
      display:"flex",
      gap:50}}>
        <Text style={{color:"white", marginHorizontal:"auto", fontSize:24}}>Resultados de Reconocimiento</Text>
        <View style={{flex:2, display:"flex",alignItems:"center"}}>
          {canvas}
        </View>

        <View style={{display:"flex", flexDirection:"row", gap: 15, marginHorizontal:"auto", marginBottom:10}}>
          <Button 
            title='Finalizar' 
            onPress={()=>{props.deleteData(); setImage(null); setScale(1);}}/>
          <Button 
            title='Reiniciar Vista' 
            onPress={()=>resetter()}/>
          <Button 
            disabled={saved}
            title='Guardar' 
            onPress={save}/>
        </View>

        <SaveModal isModalVisible={isModalVisible} setIsModalVisible={setIsModalVisible}/>
      </View> 

}

export default ScanCanvas;