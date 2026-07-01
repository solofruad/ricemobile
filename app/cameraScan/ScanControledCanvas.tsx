import { useState } from "react"
import { Button, View, Text } from "react-native"

import { Paths, Directory, File } from 'expo-file-system';
import SaveModal from "./SaveModal";
import { ObjectDetectionResult } from "@/types/types";
import ScanCanvas from "./ScanCanvas";
import DetectionsTable from "@/database/DetectionsTable";

type ScanCanvasProps = {
  detection: ObjectDetectionResult[],
  photoUri: string
  deleteData: ()=>void
}

export const getPhotosDirUri = ()=>{
  const appDataDir = Paths.document.uri;
  const photoScansDir = `${appDataDir}photoScans/`;
  return photoScansDir;
}
export const checkIfPhotosDirExists = ()=>{
  const dirInfo = new Directory(getPhotosDirUri());
  if(!dirInfo.exists){
    if(!dirInfo.createDirectory("photoScans").exists){
      throw new Error("El directorio 'photoScans' no logró ser creado");
    }
  }
}
export const deletePhotoScansDir = ()=>{
  const dirInfo = new Directory(getPhotosDirUri());
  if(dirInfo.exists){
    dirInfo.delete();
  }
}

const ScanControledCanvas = (props: ScanCanvasProps)=>{
  const [saving,setIsSaving] = useState(false);
  const [saved,setIsSaved] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  //*ScanCanvasControlsFunction
  const save = ()=>{
    setIsSaving(true);
    //* No almacenar el canvas final. En su lugar almacenar la foto original (que ya está guardada)
    //* y los resultados de la deteccion
    //Comprobar que la carpeta para almacenar los scans exista
    checkIfPhotosDirExists();
    //Mover la foto desde la ruta temporal a la ruta definitiva (dado que el método "write" de "expo-file-system" no permite escribir archivos con codificación base64, se emplea el método "moveAsync" para mover el archivo desde la ruta temporal a la ruta definitiva)
    const photoFile = new File(props.photoUri);
    photoFile.move(new Directory(getPhotosDirUri()))

    DetectionsTable.insert([photoFile.uri, props.detection]).then(()=>{
      setIsSaving(false);
      setIsSaved(true);
      setIsModalVisible(true);
    });
  }
  const close = ()=>{
    props.deleteData();
  }
  //*ScanCanvasControlsFunction

  return <View style={{
      width:"100%", 
      height:"100%", 
      bottom:0, 
      display:"flex",
      gap:50}}>
        <Text style={{color:"white", marginHorizontal:"auto", fontSize:24}}>Resultados de Reconocimiento</Text>
        <View style={{flex:2, display:"flex",alignItems:"center"}}>
          <ScanCanvas detection={props.detection} photoUri={props.photoUri} useGestureHandler={true}/>
        </View>

        <View style={{display:"flex", flexDirection:"row", gap: 15, marginHorizontal:"auto", marginBottom:10}}>
          <Button 
            title='Finalizar' 
            onPress={close}/>
          <Button 
            disabled={saved || saving}
            title={saving ? 'Guardando' : (saved ? 'Guardado' : 'Guardar')}
            onPress={save}/>
        </View>

        <SaveModal isModalVisible={isModalVisible} setIsModalVisible={setIsModalVisible}/>
      </View> 

}

export default ScanControledCanvas;