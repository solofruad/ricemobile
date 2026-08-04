import { useEffect, useState } from "react";
import { useColorScheme, View } from "react-native";

type SliderProps = {
  width:number,
  height:number,
  min:number,
  max:number,
  steps:number,
  thumb:{width:number,height:number}
  onChange:(value:number)=>void
  valueAt?:(t:number)=>number
}
export default function Slider(props:SliderProps){
  const [yTouchStart,setYTouchStart] = useState<number|null>(null)
  const [yTouchEnd,setYTouchEnd] = useState<number>(0) 
  const [y,setY] = useState(0) 

  const interval = props.max-props.min;
  const delta = props.height/props.steps;

  useEffect(()=>{
    //*Cuando se haga efectivo el cambio a null de yTouchStart (se suelta el trigger)
    //*Se reposiciona el trigger sobre el thumb
    if(yTouchStart == null){
      setYTouchEnd(y);
    }
  },[yTouchStart])

  const onChange = (newY:number)=>{
    const t = newY/props.height;
    props.onChange(props.valueAt ? props.valueAt(t) : props.min + t*interval);
  }

  const updateY = (newY:number)=>{
    if(yTouchStart == null){
      return;
    }
    newY-=yTouchStart;
    newY-= (newY % delta);
    //finger vertically outside the slider rail
    if(newY<0){
      newY = 0;
    }else if(newY>props.height){
      newY = props.height;
    }

    if(y != newY){
      setY(newY)
      onChange(newY)
    }
  }

  return <View style={{
    width:props.width,
    height:props.height,
    display:"flex",
    marginHorizontal:"auto"
  }}>
    <View style={{height:"100%", marginHorizontal:"auto", width:12, backgroundColor:"rgb(150, 150, 150)",borderRadius:10, borderColor:"#161616", borderWidth:2}}>
      <View style={{width:"100%", height:y, backgroundColor:"white", position:"absolute",borderRadius:3}} />
    </View>

    <View 
      onTouchStart={(e)=>{setYTouchStart(e.nativeEvent.pageY -y)}}
      onTouchMove={(e)=>{updateY(e.nativeEvent.pageY)}} 
      onTouchEnd={()=>{setYTouchStart(null);}}
      style={{
        width:props.thumb.width+20,
        height:props.thumb.width+20, 
        top:yTouchEnd, 
        transform:[{translateY:"-50%"},{translateX:(props.width-props.thumb.width-20)*0.5}],
        display:"flex",
        position:"absolute"}}>
      <View
        style={{
          width:props.thumb.width, 
          marginVertical:"auto",
          marginHorizontal:"auto",
          height:props.thumb.height, 
          backgroundColor:"#ffffff",
          borderRadius:props.thumb.height/2,
          top:y-yTouchEnd,
          borderColor:"black",
          borderWidth:2
        }}
      />
    </View>
  </View>
}