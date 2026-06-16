import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Canvas, useImage, ImageShader, Path as SkPath, Skia, useClock } from "@shopify/react-native-skia";
import { SharedValue, useDerivedValue, useSharedValue } from "react-native-reanimated";
import GestureHandler from "./drawingUtilities/GestureHandler";
import { Point } from "@/types/types";
import { PolygonSharedValue } from "./MonEdit";

const MARKER_SIZE = 10;

interface MonCanvasProps {
  polygonSharedData: SharedValue<PolygonSharedValue>;
  wPathSharedData: SharedValue<PolygonSharedValue>;
  showWVertexInfluence: SharedValue<boolean>;
  onPanStart: (point: Point) => void ;
  onPan: (point: Point) => void;
  onPanEnd: (point: Point) => void;
  onTap: (point: Point) => void;

  markerPos?: Point
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

const generateHandlers = (pointsList: PolygonSharedValue, useDistance: boolean = false) => {
  "worklet";
  const skPath = Skia.Path.Make();
  if (pointsList.length === 0) return skPath;

  let medianDistanceBetweenPts = 8;
  if (useDistance) {
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

  pointsList.forEach((v) => {
    skPath.addCircle(v.x, v.y, medianDistanceBetweenPts);
  });
  return skPath;
};

const generateMarker = (time:number, point?: Point) => {
  "worklet";
  const skPath = Skia.Path.Make();
  if (!point) return skPath;
  const x = point.x;
  const y = point.y- Math.sin(((time%1000)/1000)*Math.PI*2)*10;

  skPath.moveTo(x-MARKER_SIZE, y-MARKER_SIZE);
  skPath.lineTo(x+MARKER_SIZE, y-MARKER_SIZE);
  skPath.lineTo(x, y+MARKER_SIZE);
  skPath.close();

  return skPath;
};

export default function MonCanvas({
  polygonSharedData,
  wPathSharedData,
  showWVertexInfluence,
  onPanStart,
  onPan,
  onPanEnd,
  onTap,

  markerPos
}: MonCanvasProps) {
  const [dims, setDims] = useState<{ x: number; y: number } | null>(null);
  let raf:SharedValue<number> = useClock();

  useEffect(() => {
    const screen = Dimensions.get("screen");
    setDims({ x: screen.width, y: screen.height });
  }, []);

  // Trazados dinámicos mediante Derived values heredados en el Hilo de la UI
  const gPath = useDerivedValue(() => generatePath(polygonSharedData.value, true));
  const gPathW = useDerivedValue(() => generatePath(wPathSharedData.value, false));
  const gVertexes = useDerivedValue(() => generateHandlers(polygonSharedData.value));
  const gVertexesW = useDerivedValue(() => generateHandlers(wPathSharedData.value, showWVertexInfluence.value));
  const gMarker = useDerivedValue(()=> generateMarker(raf.value, markerPos))

  const image = useImage(require("../../assets/textures/field.jpg"));


  if (!dims || !image) {
    return <View style={styles.loaderContainer} />;
  }

  return (
    <GestureHandler
      panStart={onPanStart}
      pan={onPan}
      panEnd={onPanEnd}
      tap={onTap}
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
        <SkPath path={gPath} color={"white"} style="fill">
          <ImageShader
            image={image}
            tx="repeat"
            ty="repeat"
            rect={{ x: 0, y: 0, width: 250, height: 250 }}
            fit={"scaleDown"}
          />
        </SkPath>
        
        {/* Bordes y Vértices del Terreno */}
        <SkPath path={gPath} color="brown" style="stroke" strokeWidth={4} />
        <SkPath path={gVertexes} color="orange" style="stroke" strokeWidth={3} />
        
        {/* Ruta de Muestras (W-Path) y sus Vértices */}
        <SkPath path={gPathW} color="#28d102" style="stroke" strokeWidth={5} />
        <SkPath path={gVertexesW} color="#8aea15" style="stroke" strokeWidth={4} />
        
        <SkPath path={gMarker} color="#d1bc02" style="stroke" strokeWidth={5} />
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