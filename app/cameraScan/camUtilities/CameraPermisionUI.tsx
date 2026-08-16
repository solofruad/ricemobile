import { View, Text } from "react-native";
import AppButton from "@/components/ui/app-button";
import PermissionModal from "./PermissionModal";
import { useState } from "react";

type CameraPermisionUIProps = {
  permissionGranted:boolean,
  timesPermissionRejected: number,
  requestPermission: (requestions: number) => Promise<boolean>
}

export default function CameraPermisionUI(props:CameraPermisionUIProps){
  const [switcher,setSwitcher] = useState(true);

  const checkPermission = ()=>{
    props.requestPermission(2)
      .then(res=>{
        if(!res){setSwitcher(!switcher)}
      });
  }

  if(!props.permissionGranted && props.timesPermissionRejected >= 1){
    return <View style={{height:"100%", backgroundColor:"gray",alignContent:"center", justifyContent:"center",gap:25}}>
      <PermissionModal visible={switcher}/>
      <Text style={{maxWidth:"70%",marginHorizontal:"auto",textAlign:"center", color:"white",fontSize:20}}>
        Actualmente, no se tiene permiso para el uso de la cámara del dispositivo
      </Text>
      <View style={{marginHorizontal:"auto"}}>
        <AppButton 
          title="Comprobar Permiso" 
          onPress={checkPermission} />
      </View>
    </View>;
  }
}