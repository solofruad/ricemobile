import { useEffect, useState } from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { Button, IconButton, MD3DarkTheme } from "react-native-paper";

import PagerView from 'react-native-pager-view';

import DetectionsTable, { DetectionRecord } from "@/database/tables/DetectionsTable";
import { useIsFocused } from "@react-navigation/native";
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import ScanCanvas from "../cameraScan/ScanCanvas";

function PhotoSliderViewer(items:Array<DetectionRecord>, selectedIndex:number, setViewing:(index:number)=>void){
  return <PagerView style={{width:"100%", height:"100%"}} initialPage={selectedIndex} onPageSelected={(e)=>setViewing(e.nativeEvent.position)}>
    {items.map((data, index)=>(
      <View key={index} style={{width:"100%", height:"100%"}}>
        <ScanCanvas detection={data.detection} photoUri={data.photo_dir}/>
      </View>
    ))}
  </PagerView>
}

export default function AlbumModule(){
  const [images, setImages] = useState<Array<File>>([]);
  const [databaseData, setDatabaseData] = useState<Array<DetectionRecord>>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [viewing, setViewing] = useState<number>(-1);
  const isFocused = useIsFocused();

  useEffect(()=>{
    if(isFocused){
      console.log("Checking directory...");
      checkDatabase();
    }
  },[isFocused]);

  const checkDatabase = ()=>{
    DetectionsTable.getAll()
      .then( dbInfo =>{
        setDatabaseData(dbInfo);
        setImages( dbInfo.map(e=> new File(e.photo_dir)) );
      })
      .catch( e => console.log(e));
  }

  const deleteImage = ()=>{
    try{
      const detectionId = databaseData[viewing].id;
      DetectionsTable.delete(detectionId).then(_=>{
        const file = new File(databaseData[viewing].photo_dir);
        file.delete();
      });
      
      setSelectedImage(null);
      checkDatabase();
    }catch(error){
      console.log(images[viewing], viewing)
      console.error("Error deleting file:", error);
    }
  }

  const GalleryView = ()=>{ 
    if(selectedImage !== null){
      return <View style={{position:"absolute", bottom:0, left:0, width:"100%", height:"100%", backgroundColor:"rgba(0,0,0,0.8)", display:"flex", justifyContent:"center", alignItems:"center"}}>
              {PhotoSliderViewer(databaseData, selectedImage as number, setViewing)}
              <Button style={{position:"absolute", bottom:10, left:10}} icon="delete" mode="contained-tonal" theme={MD3DarkTheme} onPress={()=>{
                deleteImage();
              }}>
                Borrar
              </Button>
              
              <Button style={{position:"absolute", bottom:10,left:"50%", transform:[{translateX:"-50%"}]}} icon="layers" mode="contained-tonal" theme={MD3DarkTheme} onPress={()=>{
                router.push({
                  pathname: '/(tabs)/chatbot',
                  params: {detection: JSON.stringify(databaseData[viewing])}
                });

                }}>
                Chatbot
              </Button>

              <Button style={{position:"absolute", bottom:10, right:10}} icon="close" mode="contained-tonal" theme={MD3DarkTheme} onPress={()=>{setSelectedImage(null)}}>
                Cerrar
              </Button>
            </View>
    }
    if(images.length === 0){
      return <View style={{position:"absolute", bottom:0, left:0, width:"100%", height:"100%", display:"flex", justifyContent:"center", alignItems:"center"}}>
          <IconButton icon="image" size={64} />
          <Text style={{color:"white", fontSize:18}}>No se han encontrado imágenes guardadas</Text>
        </View>
    }


  }
  return <View style={{width:"100%", height:"100%",backgroundColor:"#121222ff", paddingTop:30, position:"relative"}}>
    <FlatList 
      data={images}
      numColumns={3}
      renderItem={({item, index})=>(
        <TouchableOpacity onPress={()=>{setSelectedImage(index); setViewing(index);}} style={{width:'33.33%', aspectRatio:1}}>
          
          <Image 
            style={{width:"100%", height:"100%", transform:[{rotate:"90deg"}]}}
            source={{uri:item.uri}} 
            />

        </TouchableOpacity>
      )}
    />

    { GalleryView() }
  </View>
}
