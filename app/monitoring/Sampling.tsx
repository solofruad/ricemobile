import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { MD3Colors } from "react-native-paper";
import { useSharedValue } from "react-native-reanimated";
import { Modal } from "react-native-reanimated-modal";

import { Point } from "@/types/types";
import MonCanvas from "./MonCanvas"; // Importamos el componente visual
import EditorActionButton from "./components/EditorActionButton";
import EditorPanel from "./components/EditorPanel";
import MonGuide from "./components/MonGuide";
import Path, { VERTEX_OPERATION } from "./path/Path";
import Vertex from "./path/Vertex";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type VertexSharedValue = { x: number; y: number; id: string };
type PolygonSharedValue = Array<VertexSharedValue>;

type SamplingProps = {
  rectPoints: Array<{ x: number; y: number }>;
  wPoints: Array<{ x: number; y: number }>;
};

export default function Sampling(props: SamplingProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const showWVertexInfluence = useSharedValue(false);

  const vertexToEditId = useSharedValue<string | null>(null);
  
  const polygon = useRef(new Path(props.rectPoints));
  const wPath = useRef(new Path(props.wPoints));

  const polygonSharedData = useSharedValue<PolygonSharedValue>([]);
  const wPathSharedData = useSharedValue<PolygonSharedValue>([]);

  const generateSharedValue = () => {
    polygonSharedData.set(polygon.current.generateLinkedList());
    wPathSharedData.set(wPath.current.generateLinkedList());
  };

  useEffect(() => {
    generateSharedValue();
  }, []);

  // MANEJADORES DE GESTOS (Pasados a MonCanvas)
  const handleTap = useCallback((point: Point) => {
    let result: VERTEX_OPERATION;

    if (true) {
      let vertex: Vertex | null;
      if ((vertex = wPath.current.getNearestVertexToGivenPoint(point))) {
        vertexToEditId.value = vertex.id;
      }
      vertexToEditId.value = null;
      generateSharedValue();
      return;
    }

  }, []);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={{ flex: 1, display: "flex", flexDirection: "row", position: "relative" }}>
      {/* #0386CB */}
      <View style={{ position: "absolute", width: "100%", height: "100%", backgroundColor:"#fffbf0" }} />

      {/* RENDERIZADO DEL CANVAS SEPARADO */}
      <MonCanvas
        polygonSharedData={polygonSharedData}
        wPathSharedData={wPathSharedData}
        showWVertexInfluence={showWVertexInfluence}
        onPanStart={()=>{}}
        onPan={()=>{}}
        onPanEnd={()=>{}}
        onTap={handleTap}
      />

      <Text style={{ position:"absolute", width:"100%", textAlign:"center", bottom:8,  color: MD3Colors.neutral30, fontSize: 16, fontStyle: "italic" }}>
        {"MOVER o AGREGAR PUNTO"}
      </Text>

      {/* BOTÓN BORRADO */}
      <View style={{ position: "absolute", left: 4, top: 35 }}>
        <EditorPanel>
          <EditorActionButton icon="trash" action={() => setShowGuide(true)} />
        </EditorPanel>
      </View>

      {/* BOTÓN AYUDA */}
      <View style={{ position: "absolute", right: 4, top: 35 }}>
        <EditorPanel>
          <EditorActionButton icon="help" action={() => setShowGuide(true)} />
        </EditorPanel>
      </View>

      {/* PANEL DE ACCIONES Y MODOS */}
      <View style={{ position: "absolute", right: 4, bottom: 10 }}>
        <EditorPanel>
          <EditorActionButton iconColor={MD3Colors.neutral40} icon="pencil" action={() => {}} />
        </EditorPanel>
      </View>

      {/* MODAL GUÍA DE USUARIO */}
      <Modal visible={showGuide} onBackdropPress={()=>setShowGuide(false)}>
        <MonGuide 
          isVisible={showGuide}
          onClose={() => setShowGuide(false)} 
        />
      </Modal>

      {/* MODAL DE REINICIO */}
      <Modal visible={showResetModal} onBackdropPress={()=>setShowResetModal(false)}>
        <View style={{ backgroundColor: "white", padding: 20, borderRadius: 10, margin: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", marginHorizontal: "auto" }}>Reiniciar Trazado</Text>
        </View>
      </Modal>

    </SafeAreaView>
    </SafeAreaProvider>
  );
}