import { IconButton, MD3Colors } from "react-native-paper";

type ActionButtonProps = {
  icon:string,
  iconColor?:string,
  action: ()=> void
}

export default function EditorActionButton (props:ActionButtonProps){ 
  return <IconButton 
            size={28} 
            style={{ margin: 3 }} 
            mode="contained" 
            containerColor="rgb(230, 230, 230)" 
            iconColor={props.iconColor ?? MD3Colors.neutral40} 
            icon={props.icon} 
            onPress={props.action} />}
