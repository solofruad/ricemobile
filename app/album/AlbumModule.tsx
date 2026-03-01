import { useEffect, useState } from "react";
import { FlatList, Image, TouchableOpacity, View } from 'react-native';
import { Button, MD3DarkTheme } from "react-native-paper";

import PagerView from 'react-native-pager-view';

import * as FileSystem from 'expo-file-system';
import { useIsFocused } from "@react-navigation/native";

function getFileURIsFromDirectory(directoryUri: string): Array<FileSystem.File> {
  const dir = new FileSystem.Directory(directoryUri);
  if(!dir.exists){
    return [];
  }else{
    return dir.list() as Array<FileSystem.File>;
  }
}

function PhotoSliderViewer(items:Array<{uri:string}>, selectedIndex:number, setViewing:(index:number)=>void){
  return <PagerView style={{width:"100%", height:"100%"}} initialPage={selectedIndex} onPageSelected={(e)=>console.log(e.nativeEvent.position)}>
    {items.map((image, index)=>(
      <View key={index} style={{width:"100%", height:"100%"}}>
        <Image style={{width:"100%", height:"100%", resizeMode:"contain"}} source={{uri:image.uri}} />
      </View>
    ))}
  </PagerView>
}

export default function AlbumModule(){
  const [images, setImages] = useState<Array<FileSystem.File>>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [viewing, setViewing] = useState<number>(-1);
  const isFocused = useIsFocused();

  useEffect(()=>{
    if(isFocused){
      console.log("Checking directory...");
      checkDir();
    }
  },[isFocused]);

  const checkDir = ()=>{
    const documentDir = FileSystem.Paths.document.uri + "photoScans/";
    setImages(getFileURIsFromDirectory(documentDir));
  }

  const deleteImage = ()=>{
    try{
      const file = new FileSystem.File(images[viewing].uri);
      file.delete();
      setSelectedImage(null);
      checkDir();
    }catch(error){
      console.log(images[viewing], viewing)
      console.error("Error deleting file:", error);
    }
  }

  return <View style={{width:"100%", height:"100%",backgroundColor:"#121222ff", paddingTop:30, position:"relative"}}>
    <FlatList 
      data={images}
      numColumns={3}
      renderItem={({item, index})=>(
        <TouchableOpacity onPress={()=>{setSelectedImage(index); setViewing(index);}} style={{width:'33.33%', aspectRatio:1}}>
        <Image 
        style={{width:"100%", height:"100%"}}
          source={{uri:item.uri}} 
          />
        </TouchableOpacity>
      )}
    />

    {selectedImage !== null && <View style={{position:"absolute", bottom:0, left:0, width:"100%", height:"100%", backgroundColor:"rgba(0,0,0,0.8)", display:"flex", justifyContent:"center", alignItems:"center"}}>
      {PhotoSliderViewer(images, selectedImage, setViewing)}
      <Button style={{position:"absolute", bottom:10, left:10}} icon="delete" mode="contained-tonal" theme={MD3DarkTheme} onPress={()=>{
        deleteImage();
      }}>
        Borrar
      </Button>
      <Button style={{position:"absolute", bottom:10, right:10}} icon="close" mode="contained-tonal" theme={MD3DarkTheme} onPress={()=>{setSelectedImage(null)}}>
        Cerrar
      </Button>
    </View>}
  </View>
}