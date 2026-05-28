import React from "react";
import { View, StyleSheet } from "react-native";
import { Canvas, useImage, ImageShader, Path as SkPath } from "@shopify/react-native-skia";
import { SharedValue } from "react-native-reanimated";
import GestureHandler from "./drawingUtilities/GestureHandler";
import { Point } from "@/types/types";

interface MonCanvasProps {
  dims: { x: number; y: number } | null;
  gPath: SharedValue<any>;
  gPathW: SharedValue<any>;
  gVertexes: SharedValue<any>;
  gVertexesW: SharedValue<any>;
  onPanStart: (point: Point) => void ;
  onPan: (point: Point) => void;
  onPanEnd: (point: Point) => void;
  onTap: (point: Point) => void;
}

export default function MonCanvas({
  dims,
  gPath,
  gPathW,
  gVertexes,
  gVertexesW,
  onPanStart,
  onPan,
  onPanEnd,
  onTap,
}: MonCanvasProps) {
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