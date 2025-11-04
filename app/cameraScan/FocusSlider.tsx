import Slider from '@react-native-community/slider';
import { useColorScheme, View } from 'react-native';
import { Icon } from 'react-native-paper';


type FocusSliderProps = {
  height:number,
  setFocusDepth: (n:number)=>void,
  minFocusDistance:number
}

const FocusSlider = (props:FocusSliderProps) => {
  const colorScheme = useColorScheme();
  const width = 45;

  return <View style={{position:"absolute", right:30, width:width, height:"100%", display:"flex"}}>
    <View style={{
        width:"auto", 
        height:props.height+width, 
        marginVertical:"auto", 
        backgroundColor:(colorScheme == "dark" ? "#00000067": "#ffffff7a"), 
        borderRadius:5
        }}>
      <View style={{width:width-5, height:width-5, marginHorizontal:"auto", marginTop: 5, transform:[{rotate:"-90deg"}]}}>
        <Icon source="cone" color={colorScheme == "light" ? "#000000ff": "#ffffffff"} size={width-5}/>
      </View>
      <Slider
        onValueChange={(n)=>{props.setFocusDepth(n)}}
        style={{
          width: props.height,
          left:-((props.height-width)/2),
          top:(props.height-width)/2,
          height: width,
          // backgroundColor:"orange",
          transform:[{translateX:"0%"},{rotate:"-90deg"},{scaleY:2.9}]
        }}
        minimumValue={0.1}
        step={props.minFocusDistance/10}
        maximumValue={props.minFocusDistance}
        minimumTrackTintColor={colorScheme == "light" ? "#000000a7": "#ffffffa3"}
        maximumTrackTintColor={colorScheme == "light" ? "#000000ff": "#ffffffff"}
      />
    </View>
  </View>
}

export default FocusSlider