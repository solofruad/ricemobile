import { useColorScheme, View } from 'react-native';
import Slider from './Slider';
import { Icon } from 'react-native-paper';



type FocusSliderProps = {
  height:number,
  setFocusDepth: (n:number)=>void,
  minFocusDistance:number
}

const FocusSlider = (props:FocusSliderProps) => {
  const colorScheme = useColorScheme();
  const width = 46;

  return <View style={{width:width, height:"100%", display:"flex"}}>
    <View style={{
        width:"auto", 
        height:"auto", 
        backgroundColor:(colorScheme == "dark" ? "#4c6f82b0": "#ffffff7a"), 
        borderRadius:5,
        display:"flex"
        }}>
      <View style={{width:width-5, height:width-5, marginHorizontal:"auto", marginTop: 5, transform:[{rotate:"0deg"}]}}>
        <Icon 
          source="image-filter-hdr" 
          color={colorScheme == "light" ? "#000000ff": "#ffffffff"} 
          size={width-5}/>
      </View>
      
      <View style={{paddingVertical:15}}>
        <Slider 
          width={width} 
          height={props.height} 
          min={0.001} 
          max={props.minFocusDistance} 
          steps={10} 
          thumb={{width:24,height:24}} 
          onChange={(n)=>{props.setFocusDepth(n)}}/>
      </View>
      
      <View style={{width:width-5, height:width-5, marginHorizontal:"auto", marginBottom: 5, transform:[{rotate:"0deg"}]}}>
        <Icon 
          source="leaf" 
          color={colorScheme == "light" ? "#000000ff": "#ffffffff"} 
          size={width-5}/>
      </View>
    </View>
  </View>
}

export default FocusSlider