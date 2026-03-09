import { ObjectDetectionResult } from "@/types/types";
import { Group, matchFont, Rect, Text } from "@shopify/react-native-skia";

function rotatePointAroundPlaneCenter(
  point: {x:number,y:number},
  plane: {width:number,height:number},
  angleDegrees: number
): {x:number,y:number} {
  // Calculate plane center
  const cx = plane.width / 2;
  const cy = plane.height / 2;

  // Convert angle to radians
  const rad = (angleDegrees * Math.PI) / 180;

  // Translate point to origin
  const tx = point.x - cx;
  const ty = point.y - cy;

  // Apply rotation
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = tx * cos - ty * sin;
  const ry = tx * sin + ty * cos;

  // Translate back
  return {
    x: rx + cx,
    y: ry + cy
  };
}

type ScanLabelsProps = {
  rects: ObjectDetectionResult[],
  scale: number
  imageDims: {width:number, height:number}
}

export default function ScanLabels (props: ScanLabelsProps){
  const fontStyle = {
    fontFamily: "arial",
    fontWeight: "bold",
    fontSize: 14
  } as const;
  const font = matchFont(fontStyle);
  const data = props.rects.map((obj)=>{
    const x = obj.frame.origin.x * props.scale;
    const y = obj.frame.origin.y * props.scale ;
    return {
      point : rotatePointAroundPlaneCenter({x,y},{width:props.imageDims.width,height:props.imageDims.width},90),
      height : obj.frame.size.y * props.scale,
      width : obj.frame.size.x * props.scale,
      text: obj.labels?.map(e=>e.text)[0] || ""
    }
  });

  return (data != null) ? data.map((obj,id)=>{
    if(obj.text == ""){
      return null;
    }
    let y = obj.point.y;
    if(y-18 < 0){
      y = 18;
    }


    return <Group key={"ScanLabel"+id}>
      <Rect
        x={obj.point.x-obj.height-2}
        y={y-18}
        width={obj.height+4}
        height={20}
        color={"green"}
        key={"labelRect"+id}
      />
      <Text
        text={obj.text}
        font={font}
        x={obj.point.x-obj.height+4}
        y={y-4}
        color={"white"}
        key={"labelText"+id}
        />
      <Rect
        x={obj.point.x-obj.height-2}
        y={y-18+obj.width}
        width={obj.height+4}
        height={20}
        color={"green"}
        key={"labelRectB"+id}
      />
      <Text
        text={"Clasificación: "+3}
        font={font}
        x={obj.point.x-obj.height+4}
        y={y+obj.width-3}
        color={"white"}
        key={"labelTextClasif"+id}
        />
    </Group>
  }) : null
}