import { ObjectDetectionResult } from "@/types/types";
import { Line, vec, Group } from "@shopify/react-native-skia";

const INCLUIR_RECONOCIMIENTOS_SIN_LABELS = false;

type ScanRectsProps = {
  rects: ObjectDetectionResult[],
  scale: number
}

export default function ScanRects (props: ScanRectsProps){
  return props.rects.map((obj,id)=>{
    if(!INCLUIR_RECONOCIMIENTOS_SIN_LABELS && obj.labels.length == 0){
      return null;
    }
    const x= obj.frame.origin.x * props.scale ;//-70
    const y= obj.frame.origin.y * props.scale ;//+70
    const xEnd = obj.frame.size.x * props.scale +x;
    const yEnd= obj.frame.size.y * props.scale +y;
    return <Group key={"rects"+id}>
      <Line
        key={"lineA"+id}
        p1={vec(x, y)}
        p2={vec(xEnd, y)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
      <Line
        key={"lineB"+id}
        p1={vec(xEnd, y)}
        p2={vec(xEnd, yEnd)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
      <Line
        key={"lineC"+id}
        p1={vec(xEnd, yEnd)}
        p2={vec(x, yEnd)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
      <Line
        key={"lineD"+id}
        p1={vec(x, yEnd)}
        p2={vec(x, y)}
        color="green"
        style="stroke"
        strokeWidth={4}
      />
    </Group>
  })
}