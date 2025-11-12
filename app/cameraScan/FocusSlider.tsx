import { useColorScheme, View } from 'react-native';
import Slider from '../(tabs)/slider';
import { Icon } from 'react-native-paper';



type FocusSliderProps = {
  height:number,
  setFocusDepth: (n:number)=>void,
  minFocusDistance:number
}

const FocusSlider = (props:FocusSliderProps) => {
  const colorScheme = useColorScheme();
  const width = 35;

  return <View style={{width:width, height:"100%", display:"flex"}}>
    <View style={{
        width:"auto", 
        height:"auto", 
        backgroundColor:(colorScheme == "dark" ? "#57111167": "#ffffff7a"), 
        borderRadius:5,
        display:"flex"
        }}>
      <View style={{width:width-5, height:width-5, marginHorizontal:"auto", marginTop: 5, transform:[{rotate:"90deg"}]}}>
        <Icon source="ruler" color={colorScheme == "light" ? "#000000ff": "#ffffffff"} size={width-5}/>

      </View>
      {/* <Slider
        minimumTrackTintColor={colorScheme == "light" ? "#000000a7": "#ffffffa3"}
        maximumTrackTintColor={colorScheme == "light" ? "#000000ff": "#ffffffff"}
      /> */}
      <View style={{paddingVertical:15}}>
        <Slider 
          width={width} 
          height={props.height} 
          min={0.1} 
          max={props.minFocusDistance} 
          step={props.minFocusDistance/10} 
          thumb={{width:40,height:15}} 
          onChange={(n)=>{props.setFocusDepth(n)}}/>
      </View>
      
    </View>
  </View>
}

export default FocusSlider