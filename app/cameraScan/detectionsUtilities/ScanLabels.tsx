import { ObjectDetectionResult } from '@/src/ObjectDetection';
import { Group, matchFont, Rect, Text } from "@shopify/react-native-skia";
import { getDiseaseColor } from "@/app/monitoring/diseaseColors";

function rotatePointAroundPlaneCenter(
  point: {x:number,y:number},
  plane: {width:number,height:number},
  angleDegrees: number
): {x:number,y:number} {
  const cx = plane.width / 2;
  const cy = plane.height / 2;
  const rad = (angleDegrees * Math.PI) / 180;
  const tx = point.x - cx;
  const ty = point.y - cy;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = tx * cos - ty * sin;
  const ry = tx * sin + ty * cos;
  return {
    x: rx + cx,
    y: ry + cy
  };
}

type ScanLabelsProps = {
  rects?: ObjectDetectionResult[],
  scale: number
  imageDims: {width:number, height:number}
  diseaseColorMap?: Record<string, string>
}

export default function ScanLabels (props: ScanLabelsProps){
  const rects = props.rects ?? [];
  const fontStyle = {
    fontFamily: "arial",
    fontWeight: "bold",
    fontSize: 14
  } as const;
  const font = matchFont(fontStyle);
  const data = rects.map((obj)=>{
    const x = obj.frame.origin.x * props.scale;
    const y = obj.frame.origin.y * props.scale ;
    const diseaseName = obj.labels?.[0]?.text || "";
    const color = (diseaseName && props.diseaseColorMap)
      ? (props.diseaseColorMap[diseaseName] || getDiseaseColor(diseaseName))
      : (diseaseName ? getDiseaseColor(diseaseName) : "#2cac0f");
    return {
      point : rotatePointAroundPlaneCenter({x,y},{width:props.imageDims.width,height:props.imageDims.width},90),
      height : obj.frame.size.y * props.scale,
      width : obj.frame.size.x * props.scale,
      text: diseaseName,
      confidence: obj.labels?.map(e=>e.confidence)[0] || "",
      color
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
        color={obj.color}
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
        color={obj.color}
        key={"labelRectB"+id}
      />
      <Text
        text={`Conf.: ${Math.round(parseFloat(obj.confidence as any)*100)}%`}
        font={font}
        x={obj.point.x-obj.height+4}
        y={y+obj.width-3}
        color={"white"}
        key={"labelTextClasif"+id}
        />
    </Group>
  }) : null
}