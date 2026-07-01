import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, ScrollView, Text, Vibration, View } from "react-native";
import { Icon, MD3Colors } from "react-native-paper";
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
import { Modal } from "react-native-reanimated-modal";

import { Point } from "@/types/types";
import MonCanvas from "./MonCanvas"; // Importamos el componente visual
import EditorActionButton from "./components/EditorActionButton";
import EditorPanel from "./components/EditorPanel";
import MonGuide from "./components/MonGuide";
import Path from "./path/Path";
import Vertex from "./path/Vertex";

type VertexSharedValue = { x: number; y: number; id: string };
type PolygonSharedValue = Array<VertexSharedValue>;

type SamplingProps = {
  forcefullyGoToEditMode: ()=>void;
  polygonPoints: Array<{ x: number; y: number }>;
  wPathPoints: Array<{ x: number; y: number }>;
};

export default function Sampling(props: SamplingProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const showWVertexInfluence = useSharedValue(false);

  const vertexToEdit = useSharedValue<Point | null>(null);
  const animSamplesBottom = useSharedValue(-140);
  const animHelpTextOpacity = useSharedValue(1);
  
  const polygon = useRef(new Path(props.polygonPoints));
  const wPath = useRef(new Path(props.wPathPoints));

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
    if (true) {
      let vertex: Vertex | null;
      if ((vertex = wPath.current.getNearestVertexToGivenPoint(point))) {
        vertexToEdit.set(vertex.getAsPoint());
        handlePress(true);
        Vibration.vibrate(50);
      } else {
        vertexToEdit.set(null);
        handlePress(false);
      }
    }
  }, []);

  const handlePress = (open:boolean) => {
    animSamplesBottom.value = withSpring(open ? 0 : -140);
    animHelpTextOpacity.value = withSpring(open ? 0 : 1);
  };

  return (
    <>
      {/* #0386CB */}
      <View style={{ position: "absolute", width: "100%", height: "100%", bottom:0, backgroundColor:"#fffbf0" }} />

      {/* RENDERIZADO DEL CANVAS SEPARADO */}
      <MonCanvas
        polygonSharedData={polygonSharedData}
        wPathSharedData={wPathSharedData}
        showWVertexInfluence={showWVertexInfluence}
        onTap={handleTap}

        markerPos={vertexToEdit}
      />

      <Animated.Text style={{ position:"absolute", width:"100%", textAlign:"center", bottom:8,  color: MD3Colors.neutral30, fontSize: 16, fontStyle: "italic", opacity:animHelpTextOpacity }}>
        {"SELECCIONE UN PUNTO DEL TRAZADO PARA TOMAR MUESTRAS"}
      </Animated.Text>

      {/* BOTÓN BORRADO */}
      <View style={{ position: "absolute", left: 4, top: 38 }}>
        <EditorPanel>
          <EditorActionButton icon="delete-outline" action={() => setShowResetModal(true)} />
        </EditorPanel>
      </View>

      {/* BOTÓN AYUDA */}
      <View style={{ position: "absolute", right: 4, top: 38 }}>
        <EditorPanel>
          <EditorActionButton icon="help" action={() => setShowGuide(true)} />
        </EditorPanel>
      </View>

      <Animated.View 
          style={{ position: "absolute", bottom:(animSamplesBottom), width: "100%",  paddingVertical: 10,paddingHorizontal:10}} >
        <Text style={{ color: MD3Colors.neutral30, fontSize: 16, fontStyle: "italic", marginBottom: 8 }}>
          {"MUESTRAS TOMADAS EN EL PUNTO SELECCIONADO"}
        </Text>
        <ScrollView 
          style={{ width: "100%"}} 
          contentContainerStyle={{ display: "flex", flexDirection: "row", gap: 10}}
          horizontal 
          showsHorizontalScrollIndicator={false}>
            <View style={{ borderColor: "rgb(189, 109, 23)", borderWidth:4, borderRadius: 10, width:80, height:80, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Icon source="leaf" size={40} color="rgb(26, 189, 23)"/>
            </View>
            <View style={{ borderColor: "rgb(189, 109, 23)", borderWidth:4, borderRadius: 10, width:80, height:80, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Icon source="leaf" size={40} color="rgb(26, 189, 23)"/>
            </View>
            <View style={{ borderColor: "rgb(189, 109, 23)", borderWidth:4, borderRadius: 10, width:80, height:80, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Icon source="leaf" size={40} color="rgb(26, 189, 23)"/>
            </View>
            <View style={{ borderColor: "rgb(189, 109, 23)", borderWidth:4, borderRadius: 10, width:80, height:80, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Icon source="leaf" size={40} color="rgb(26, 189, 23)"/>
            </View>
            <View style={{ borderColor: "rgb(189, 109, 23)", borderWidth:4, borderRadius: 10, width:80, height:80, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Icon source="leaf" size={40} color="rgb(26, 189, 23)"/>
            </View>
        </ScrollView>
      </Animated.View>

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
          <Text style={{ fontSize: 22, fontWeight: "bold", marginHorizontal: "auto", marginBottom: 5 }}>Rediseñar Trazado</Text>
          <Text style={{ fontSize: 16, textAlign: "center", marginVertical: 10 }}>
            ¿Desea rediseñar el trazado del cultivo a monitorear?
          </Text>
          <Text style={{ fontSize: 15, textAlign: "center", marginVertical: 5, color: MD3Colors.neutral40 }}>
            Cambiar el diseño descartará el trazado actual y las muestras que se hayan tomado hasta ahora.
          </Text>
          <View style={{ display: "flex", flexDirection: "column", marginTop: 25,  marginBottom:10, marginHorizontal: "auto", gap: 10 }}>
            <Button
              title="Sí, realizar rediseño"
              onPress={() => {
                // Aquí iría la lógica para iniciar el monitoreo con el trazado actual
                setShowResetModal(false);
                props.forcefullyGoToEditMode()
              }}
            />
            <Button title="No, seguir monitoreando" onPress={() => setShowResetModal(false)} />
          </View>
        </View>
      </Modal>

    </>
  );
}