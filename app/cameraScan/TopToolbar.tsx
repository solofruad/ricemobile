import { Animated, View } from "react-native"
import FocusSlider from "./FocusSlider"
import { useRef, useState } from "react"
import { Button, Icon, MD3Colors, MD3DarkTheme } from "react-native-paper"

type TopToolbarProps = {
  setFocusDepth: (n:number)=>void
  minFocusDistance: number,
  onShow?: ()=>void,
  onHide?: ()=>void
}

export default function TopToolbar(props: TopToolbarProps){
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showing,setShowing] = useState(false);
  
  const fadeInFn = ()=>{
    props.onShow?.();
    setShowing(true);
    Animated.timing(fadeAnim, {
      toValue: -60,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }

  const fadeOutFn = ()=>{
    props.onHide?.();
    setShowing(false);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  return <>
      <Animated.View style={[{position:"absolute",bottom:120, right:-50},{transform: [{ translateX: fadeAnim }]}]}>
        <FocusSlider 
          setFocusDepth={props.setFocusDepth} 
          height={270} 
          minFocusDistance={props.minFocusDistance}/>
      </Animated.View>
    <View style={{position:"absolute",right:16,bottom:30}}>
      <Button 
        icon={()=><Icon source="ruler" size={28} color={showing ? "rgb(240, 240, 240)" : "rgb(87, 87, 87)"}/>}
        mode="contained"
        labelStyle={{fontSize:16}}
        textColor={showing ? "rgb(240, 240, 240)" : "rgb(87, 87, 87)"}
        buttonColor={!showing ? "rgb(255, 255, 255)" : "rgb(87, 87, 87)"}
        onPress={showing ? fadeOutFn : fadeInFn}
        style={{ 
                        borderRadius: 45,
                        alignItems: 'center',
                        borderWidth: 3, // Border thickness
                        borderColor: '#6a6a6a90', // Border color
                 }}>
        Enfocar
      </Button>
    </View>
  </> 
}