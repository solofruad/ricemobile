import { Point } from "@/types/types";
import { Canvas, ImageShader, Path as SkPath, Skia, useClock } from "@shopify/react-native-skia";
import React, { useEffect, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { SharedValue, useDerivedValue } from "react-native-reanimated";
import GestureHandler from "./drawingUtilities/GestureHandler";
import { useFieldTexture } from "./drawingUtilities/texture";
import { PolygonSharedValue } from "./MonEdit";

const MARKER_SIZE = 18;

interface MonCanvasProps {
  polygonSharedData: SharedValue<PolygonSharedValue>;
  samplingPathSharedData: SharedValue<PolygonSharedValue>;
  showWVertexInfluence?: SharedValue<boolean>;
  onPanStart?: (point: Point) => void ;
  onPan?: (point: Point) => void;
  onPanEnd?: (point: Point) => void;
  onTap: (point: Point) => void;

  completenessPerSamplingPoint?: SharedValue<Array<number>>;
  healthPerSamplingPoint?: SharedValue<Array<number>>;
  markerPos?: SharedValue<Point | null>
  samplingMode?: boolean
}

// WORKLETS
const generatePath = (pointsList: PolygonSharedValue, isClosedPath: boolean) => {
  "worklet";
  const skPath = Skia.Path.Make();
  if (pointsList.length === 0) return skPath;

  skPath.moveTo(pointsList[0].x, pointsList[0].y);
  for (let i = 1; i < pointsList.length; i++) {
    skPath.lineTo(pointsList[i].x, pointsList[i].y);
  }
  if (isClosedPath) skPath.close();

  return skPath;
};

const generateHandlers = (pointsList: PolygonSharedValue, useExtraDistance: boolean = false, completenessPerPoint?: Array<number>, increasedRadius?: boolean) => {
  "worklet";
  const skPath = Skia.Path.Make();
  if (pointsList.length === 0) return skPath;

  let medianDistanceBetweenPts = increasedRadius ? 12 : 9;
  if (useExtraDistance) {
    for (let i = 0; i < pointsList.length - 1; i++) {
      const nextIndex = (i + 1) % pointsList.length;
      const distance = Math.sqrt(
        Math.pow(pointsList[nextIndex].x - pointsList[i].x, 2) +
          Math.pow(pointsList[nextIndex].y - pointsList[i].y, 2)
      );
      medianDistanceBetweenPts += distance;
    }
    medianDistanceBetweenPts /= pointsList.length;
    medianDistanceBetweenPts /= 2;
  }


  if(completenessPerPoint ){
    pointsList.forEach((v,i) => {
      skPath.addCircle(v.x, v.y, completenessPerPoint[i] * (medianDistanceBetweenPts+0.7-(completenessPerPoint[i]*1)));
    });
  }else{
    pointsList.forEach((v) => {
      skPath.addCircle(v.x, v.y, medianDistanceBetweenPts+1);
    });
  }
  return skPath;
};

const generateHealthVertices = (pointsList: PolygonSharedValue, healthPerPoint?: Array<number>, increasedRadius?: boolean) => {
  "worklet";
  const grayPath = Skia.Path.Make();
  const greenPath = Skia.Path.Make();
  const redPath = Skia.Path.Make();
  if (!healthPerPoint) return { grayPath, greenPath, redPath };

  const radius = (increasedRadius ? 12 : 9) + 0;
  pointsList.forEach((v, i) => {
    const target = healthPerPoint[i] === 2 ? redPath : healthPerPoint[i] === 1 ? greenPath : grayPath;
    target.addCircle(v.x, v.y, radius);
  });
  return { grayPath, greenPath, redPath };
};

const generateMarker = (time:number, point: Point|null) => {
  "worklet";
  // console.log(point)
  const skPath = Skia.Path.Make();
  if (!point) return skPath;
  const x = point.x;
  const y = point.y - Math.sin(((time%1000)/1000)*Math.PI*2)*10 -30;

  skPath.moveTo(x-MARKER_SIZE, y-MARKER_SIZE);
  skPath.lineTo(x+MARKER_SIZE, y-MARKER_SIZE);
  skPath.lineTo(x, y+MARKER_SIZE);
  skPath.close();

  return skPath;
};

export default function MonCanvas(props: MonCanvasProps) {
  const [dims, setDims] = useState<{ x: number; y: number } | null>(null);
  let raf:SharedValue<number> = useClock();

  useEffect(() => {
    const screen = Dimensions.get("screen");
    setDims({ x: screen.width, y: screen.height });
  }, []);

  // Trazados dinámicos mediante Derived values heredados en el Hilo de la UI
  const gPath = useDerivedValue(() => generatePath(props.polygonSharedData.value, true));
  const gPathW = useDerivedValue(() => generatePath(props.samplingPathSharedData.value, false));
  const gVertexes = useDerivedValue(() => generateHandlers(props.polygonSharedData.value));
  const gVertexesW = useDerivedValue(() => generateHandlers(props.samplingPathSharedData.value, props.showWVertexInfluence?.value || false, undefined, props.samplingMode));
  const gVertexesWCompleteness = useDerivedValue(() => generateHandlers(props.samplingPathSharedData.value, props.showWVertexInfluence?.value || false, props.completenessPerSamplingPoint?.value, props.samplingMode));
  const gHealthVertices = useDerivedValue(() => generateHealthVertices(props.samplingPathSharedData.value, props.healthPerSamplingPoint?.value, props.samplingMode));
  const gMarker = useDerivedValue(()=> generateMarker(raf.value, (props.markerPos === undefined ? null : props.markerPos!.value)))

  const image = useFieldTexture();


  if (!dims || !image) {
    return <View style={styles.loaderContainer} />;
  }

  return (
    <GestureHandler
      panStart={props.onPanStart}
      pan={props.onPan}
      panEnd={props.onPanEnd}
      tap={props.onTap}
    >
      <Canvas
        style={{
          width: dims.x,
          height: dims.y,
          marginTop: "auto",
          marginBottom: "auto",
          position: "relative",
        }}
      >
        {/* Polígono Base con Textura */}
        <SkPath path={gPath} style="fill">
          <ImageShader
            image={image}
            tx="repeat"
            ty="repeat"
            rect={{ x: 0, y: 0, width: 450, height: 800 }}
            fit={"scaleDown"}
          />
        </SkPath>
        {props.samplingMode && <SkPath path={gPath} color="black" style="fill" opacity={0.3} />}
        
        {/* Bordes y Vértices del Terreno */}
        <SkPath path={gPath} color="#d25151" style="stroke" strokeWidth={4} />
        {!props.samplingMode && <SkPath path={gVertexes} color="orange" style="stroke" strokeWidth={3} />}
        
        {/* Ruta de Muestras (W-Path) y sus Vértices */}
        <SkPath path={gPathW} color="#2cac0f" style="stroke" strokeWidth={5} />
        <SkPath path={gVertexesW} color="#a6ff3a" style="stroke" strokeWidth={3} />
        {
          props.completenessPerSamplingPoint && <SkPath path={gVertexesWCompleteness} color="#3cff00" style="fill"/>
        }
        {
          props.healthPerSamplingPoint && <>
            <SkPath path={gHealthVertices.value.grayPath} color="#9e9e9e" style="fill" />
            <SkPath path={gHealthVertices.value.greenPath} color="#2cac0f" style="fill" />
            <SkPath path={gHealthVertices.value.redPath} color="#d25151" style="fill" />
          </>
        }
        
        <SkPath path={gMarker} color="#1dbfe0" style="fill" strokeWidth={5} />
      </Canvas>
    </GestureHandler>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    backgroundColor: "#1c100fff",
    flex: 1,
  },
});