import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, ScrollView, Text, TouchableOpacity, Vibration, View } from "react-native";
import { Icon, MD3Colors } from "react-native-paper";
import Animated, { useSharedValue, withSpring } from "react-native-reanimated";
import { Modal } from "react-native-reanimated-modal";

import { MonitorDrawingRecord } from "@/database/tables/MonitorDrawingsTable";
import { ObjectDetectionResult } from "@/src/ObjectDetection";
import { Point } from "@/types/types";
import CamScan from "../cameraScan/camscan";
import MonCanvas from "./MonCanvas";
import EditorActionButton from "./components/EditorActionButton";
import EditorPanel from "./components/EditorPanel";
import MonGuide from "./components/MonGuide";
import Path from "./path/Path";
import Vertex from "./path/Vertex";

const MAX_SAMPLES_PER_POINT = 5;

const PANEL_SPRING = { damping: 18, stiffness: 180, mass: 0.6 };

export type SamplingData = {
  id_monitoring: number;
  index_sampling_point: number;
  index_photo_in_sampling_point: number;
  photo_dir: string;
  detection: Array<ObjectDetectionResult>;
};

type VertexSharedValue = { x: number; y: number; id: string };
type PolygonSharedValue = Array<VertexSharedValue>;

type SamplingProps = {
  forcefullyGoToEditMode: () => void;
  drawingData: MonitorDrawingRecord | null;
};

const detectionsListing = (tableInfo: SamplingData[][]) => { //TODO: IMPLEMENTAR
  return tableInfo
  .flat() //Per sample
	.map(
		e => {
			return e.detection.map( //per detection in each sample
				h => ({
					detection:h.labels[0], 
					index_sampling_point:e.index_sampling_point, 
					index_photo_in_sampling_point: e.index_photo_in_sampling_point
				})
			)
	})
	.flat()
}

export default function Sampling(props: SamplingProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedSamples, setCapturedSamples] = useState<SamplingData[][]>([]);
  const [vertexIndex, setVertexIndex] = useState<number>(-1);

  const [totalSamplingPoints, setTotalSamplingPoints] = useState(0);
  const vertexIndexRef = useRef(-1);

  const vertexToEdit = useSharedValue<Point | null>(null);
  const animSamplesBottom = useSharedValue(-160);
  const animHelpTextOpacity = useSharedValue(1);
  const animPolygonDisplace = useSharedValue(0);

  const polygon = useRef(new Path(props.drawingData?.polygon || []));
  const samplingPath = useRef(new Path(props.drawingData?.samplingPath || []));

  const completenessPerSamplingPoint = useSharedValue<Array<number>>([]);

  const polygonSharedData = useSharedValue<PolygonSharedValue>([]);
  const samplingPathSharedData = useSharedValue<PolygonSharedValue>([]);

  useEffect(() => {
    const polygonList = polygon.current.generateLinkedList();
    const samplingList = samplingPath.current.generateLinkedList();
    polygonSharedData.set(polygonList);
    samplingPathSharedData.set(samplingList);
    setTotalSamplingPoints(samplingList.length);
  }, []);

  useEffect(() => {
    vertexIndexRef.current = vertexIndex;
  }, [vertexIndex]);

  const handlePress = useCallback((open: boolean) => {
    animSamplesBottom.value = withSpring(open ? 0 : -160, PANEL_SPRING);
    animHelpTextOpacity.value = withSpring(open ? 0 : 1, PANEL_SPRING);
    animPolygonDisplace.value = withSpring(open ? 70 : 0, PANEL_SPRING);
  }, []);

  const handleTap = useCallback((point: Point) => {
    let vertex: Vertex | null;
    if ((vertex = samplingPath.current.getNearestVertexToGivenPoint(point))) {
      const actualVertexIndex = samplingPathSharedData.value.findIndex((v) => v.id === vertex!.id);
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
  }, [handlePress]);

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
      const newR = [...prev];

      if (newR[activeVertexIndex] === undefined) {
        newR[activeVertexIndex] = [];
      }

      newR[activeVertexIndex] = [
        ...newR[activeVertexIndex],
        {
          id_monitoring: props.drawingData?.id || 0,
          index_sampling_point: activeVertexIndex,
          index_photo_in_sampling_point: newR[activeVertexIndex].length,
          photo_dir: result.photo_dir,
          detection: result.detection,
        },
      ];

      completenessPerSamplingPoint.set(newR.map((samples) => (samples?.length || 0) / MAX_SAMPLES_PER_POINT));

      console.log(newR);

      return newR;
    });

    setShowCamera(false);
  }, [props.drawingData?.id]);

  const allPointsComplete =
    totalSamplingPoints > 0 &&
    capturedSamples.length >= totalSamplingPoints &&
    capturedSamples.every((samples) => (samples?.length || 0) >= MAX_SAMPLES_PER_POINT);

  return (
    <>
      <View style={{ position: "absolute", width: "100%", height: "100%", bottom: 0, backgroundColor: "#fffbf0" }} />

      <Animated.View style={{ position: "absolute", width: "100%", height: "100%", bottom: animPolygonDisplace }}>
        <View style={{ position: "relative", width: "100%", height: "100%" }}>
          <MonCanvas
            polygonSharedData={polygonSharedData}
            samplingPathSharedData={samplingPathSharedData}
            markerPos={vertexToEdit}
            completenessPerSamplingPoint={completenessPerSamplingPoint}
            onTap={handleTap}
            hidePolygonVertexHandlers={true}
          />
        </View>
      </Animated.View>

      {allPointsComplete ? (
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
          "SELECCIONE UN PUNTO DEL TRAZADO PARA TOMAR MUESTRAS"
        </Animated.Text>
      ) : (
        <Animated.View
          style={{
            position: "absolute",
            width: "100%",
            bottom: 16,
            opacity: animHelpTextOpacity,
          }}
        >
          <View style={{width:"auto",marginHorizontal:"auto"}}>
            <Button title="PROCESAR MUESTRAS TOMADAS" />
          </View>
        </Animated.View>
      )}

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
          boxShadow: [
            {
              offsetX: 10,
              offsetY: 10,
              blurRadius: 5,
              spreadDistance: 8,
              color: "rgba(0,0,0,1)",
              inset: false,
            },
          ],
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
          {capturedSamples[vertexIndex]?.map((sample, index) => (
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
          ))}
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
              <Icon source="leaf" size={45} color="rgb(26, 189, 23)" />
            </TouchableOpacity>
          )}
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