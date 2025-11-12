import { Animated, View } from "react-native"
import FocusSlider from "./FocusSlider"
import { useEffect, useRef, useState } from "react"
import { Button, MD3DarkTheme } from "react-native-paper"

type TopToolbarProps = {
  setFocusDepth: (n:number)=>void
  minFocusDistance: number,
}

export default function TopToolbar(props: TopToolbarProps){
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showing,setShowing] = useState(false);
  
  const fadeInFn = ()=>{
    setShowing(true);
    Animated.timing(fadeAnim, {
      toValue: -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  const fadeOutFn = ()=>{
    setShowing(false);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  return <>
      <Animated.View style={[{position:"absolute",bottom:120, right:-50},{transform: [{ translateX: fadeAnim }]}]}>
        <FocusSlider setFocusDepth={props.setFocusDepth} height={270} minFocusDistance={props.minFocusDistance*1.1}/>
      </Animated.View>
    <View style={{position:"absolute",right:20,bottom:20}}>
      <Button icon="ruler" mode="contained-tonal" theme={MD3DarkTheme} onPress={showing ? fadeOutFn : fadeInFn}>
        Enfocar
      </Button>
    </View>
  </>
}