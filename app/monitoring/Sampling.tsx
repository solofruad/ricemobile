import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, ScrollView, Text, TouchableOpacity, Vibration, View } from "react-native";
import { Icon, MD3Colors } from "react-native-paper";
import Animated, { useSharedValue, withSpring } from "react-native-reanimated";
import { Modal } from "react-native-reanimated-modal";

import { MonitorDrawingRecord } from "@/database/tables/MonitorDrawingsTable";
import { ObjectDetectionResult } from "@/src/ObjectDetection";
import { Point } from "@/types/types";
import CamScan from "../cameraScan/camscan";
import MonCanvas from "./MonCanvas"; // Importamos el componente visual
import EditorActionButton from "./components/EditorActionButton";
import EditorPanel from "./components/EditorPanel";
import MonGuide from "./components/MonGuide";
import Path from "./path/Path";
import Vertex from "./path/Vertex";

const MAX_SAMPLES_PER_POINT = 5;

export type SamplingData = {
  id_monitoring: number;
  index_sampling_point: number;
  index_photo_in_sampling_point: number;
  photo_dir: string; // Directorio de la foto
  detection: Array<ObjectDetectionResult>;
};

type VertexSharedValue = { x: number; y: number; id: string };
type PolygonSharedValue = Array<VertexSharedValue>;

type SamplingProps = {
  forcefullyGoToEditMode: () => void;
  drawingData: MonitorDrawingRecord | null;
};


export default function Sampling(props: SamplingProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedSamples, setCapturedSamples] = useState<SamplingData[][]>([]);
  const [vertexIndex, setVertexIndex] = useState<number>(-1);
  const vertexIndexRef = useRef(-1);

  const showWVertexInfluence = useSharedValue(false);
  const vertexToEdit = useSharedValue<Point | null>(null);
  const animSamplesBottom = useSharedValue(-160);
  const animHelpTextOpacity = useSharedValue(1);
  const animPolygonDisplace = useSharedValue(0);

  const polygon = useRef(new Path(props.drawingData?.polygon || []));
  const samplingPath = useRef(new Path(props.drawingData?.samplingPath || []));

  const polygonSharedData = useSharedValue<PolygonSharedValue>([]);
  const samplingPathSharedData = useSharedValue<PolygonSharedValue>([]);

  const generateSharedValue = () => {
    polygonSharedData.set(polygon.current.generateLinkedList());
    samplingPathSharedData.set(samplingPath.current.generateLinkedList());
  };

  useEffect(() => {
    generateSharedValue();
  }, []);

  useEffect(() => {
    vertexIndexRef.current = vertexIndex;
  }, [vertexIndex]);

  // MANEJADORES DE GESTOS (Pasados a MonCanvas)
  const handleTap = useCallback((point: Point) => {
    let vertex: Vertex | null;
    if ((vertex = samplingPath.current.getNearestVertexToGivenPoint(point))) {
      let actualVertexIndex = samplingPathSharedData.value.findIndex((v) => v.id === vertex!.id);
      setVertexIndex(actualVertexIndex);
      vertexIndexRef.current = actualVertexIndex;
      
      vertexToEdit.set(vertex.getAsPoint());
      handlePress(true);
      Vibration.vibrate(50);
    } else {
      setVertexIndex(-1);
      vertexIndexRef.current = -1;
      vertexToEdit.set(null);
      handlePress(false);
    }
  }, []);

  const handlePress = (open: boolean) => {
    animSamplesBottom.value = withSpring(open ? 0 : -160);
    animHelpTextOpacity.value = withSpring(open ? 0 : 1);
    animPolygonDisplace.value = withSpring(!open ? 0 : 70);
  };

  const openTakePhoto = useCallback(() => {
    setShowCamera(true);
  }, []);

  const handleCameraResult = useCallback((result: { photo_dir: string; detection: ObjectDetectionResult[] }) => {
    const activeVertexIndex = vertexIndexRef.current;

    if (activeVertexIndex < 0) {
      setShowCamera(false);
      return;
    }

    setCapturedSamples((prev) => {
      let newR = [...prev];

      if (newR[activeVertexIndex] === undefined) {
        newR[activeVertexIndex] = [];
      }

      newR[activeVertexIndex].push({
        id_monitoring: props.drawingData?.id || 0,
        index_sampling_point: activeVertexIndex,
        index_photo_in_sampling_point: newR[activeVertexIndex].length,
        photo_dir: result.photo_dir,
        detection: result.detection,
      });

      console.log("Samples captured:", newR);

      return newR;
    });
    setShowCamera(false);
  }, [props.drawingData?.id]);

  return (
    <>
      <View style={{ position: "absolute", width: "100%", height: "100%", bottom: 0, backgroundColor: "#fffbf0" }} />

      <Animated.View style={{ position: "absolute", width: "100%", height: "100%", bottom: animPolygonDisplace }}>
        <View style={{ position: "relative", width: "100%", height: "100%" }}>
          <MonCanvas
            polygonSharedData={polygonSharedData}
            samplingPathSharedData={samplingPathSharedData}
            showWVertexInfluence={showWVertexInfluence}
            onTap={handleTap}
            markerPos={vertexToEdit}
            hidePolygonVertexHandlers={true}
          />
        </View>
      </Animated.View>

      <Animated.Text
        style={{
          position: "absolute",
          width: "100%",
          textAlign: "center",
          bottom: 16,
          color: MD3Colors.neutral30,
          fontSize: 16,
          fontStyle: "italic",
          opacity: animHelpTextOpacity,
        }}
      >
        SELECCIONE UN PUNTO DEL TRAZADO PARA TOMAR MUESTRAS
      </Animated.Text>

      <View style={{ position: "absolute", left: 4, top: 38 }}>
        <EditorPanel>
          <EditorActionButton icon="delete-outline" action={() => setShowResetModal(true)} />
        </EditorPanel>
      </View>

      <View style={{ position: "absolute", right: 4, top: 38 }}>
        <EditorPanel>
          <EditorActionButton icon="help" action={() => setShowGuide(true)} />
        </EditorPanel>
      </View>

      <Animated.View
        style={{
          position: "absolute",
          bottom: animSamplesBottom,
          width: "100%",
          boxShadow: [{
            offsetX: 10,
            offsetY: 10,
            blurRadius: 5,
            spreadDistance: 8,
            color: "rgba(0,0,0,1)",
            inset: false,
          }],
          paddingVertical: 10,
          paddingHorizontal: 10,
          backgroundColor: "#fffbf0",
        }}
      >
        <Text style={{ color: MD3Colors.neutral30, fontSize: 16, fontStyle: "italic", marginBottom: 8 }}>
          MUESTRAS TOMADAS EN EL PUNTO SELECCIONADO ({capturedSamples[vertexIndex]?.length || 0} de {MAX_SAMPLES_PER_POINT})
        </Text>

        <ScrollView
          style={{ width: "100%" }}
          contentContainerStyle={{ display: "flex", flexDirection: "row", gap: 10 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {
            capturedSamples[vertexIndex]?.map((sample, index) => (
              <View
                key={`${sample.photo_dir}-${index}`}
                style={{
                  borderColor: "rgb(189, 109, 23)",
                  borderWidth: 4,
                  borderRadius: 10,
                  width: 80,
                  height: 80,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                }}
              >
                <Text style={{ color: MD3Colors.neutral30, fontSize: 20, fontWeight: "bold" }}>
                  {sample.detection.length}
                </Text>
                <Text style={{ color: MD3Colors.neutral30, fontSize: 12, textAlign: "center" }}>
                  detección{sample.detection.length === 1 ? "" : "es"}
                </Text>
              </View>
            ))
            }
            {(capturedSamples[vertexIndex]?.length < MAX_SAMPLES_PER_POINT || !capturedSamples[vertexIndex]) && (
            <TouchableOpacity
              style={{
                borderColor: "rgb(189, 109, 23)",
                borderWidth: 4,
                borderRadius: 10,
                width: 80,
                height: 80,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={openTakePhoto}
            >
                <Icon source="leaf" size={45} color="rgb(26, 189, 23)"/>
            </TouchableOpacity>)
          }
        </ScrollView>
      </Animated.View>

      <Modal visible={showGuide} onBackdropPress={() => setShowGuide(false)}>
        <MonGuide isVisible={showGuide} onClose={() => setShowGuide(false)} />
      </Modal>

      <Modal visible={showResetModal} onBackdropPress={() => setShowResetModal(false)}>
        <View style={{ backgroundColor: "white", padding: 20, borderRadius: 10, margin: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", marginHorizontal: "auto", marginBottom: 5 }}>
            Rediseñar Trazado
          </Text>
          <Text style={{ fontSize: 16, textAlign: "center", marginVertical: 10 }}>
            ¿Desea rediseñar el trazado del cultivo a monitorear?
          </Text>
          <Text style={{ fontSize: 15, textAlign: "center", marginVertical: 5, color: MD3Colors.neutral40 }}>
            Cambiar el diseño descartará el trazado actual y las muestras que se hayan tomado hasta ahora.
          </Text>
          <View style={{ display: "flex", flexDirection: "column", marginTop: 25, marginBottom: 10, marginHorizontal: "auto", gap: 10 }}>
            <Button
              title="Sí, realizar rediseño"
              onPress={() => {
                setShowResetModal(false);
                props.forcefullyGoToEditMode();
              }}
            />
            <Button title="No, seguir monitoreando" onPress={() => setShowResetModal(false)} />
          </View>
        </View>
      </Modal>

      {showCamera && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
          <CamScan onResult={handleCameraResult} onClose={() => setShowCamera(false)} />
        </View>
      )}
    </>
  );
}