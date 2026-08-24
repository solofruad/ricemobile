import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Icon, MD3Colors, Menu } from "react-native-paper";
import Animated, { useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Point } from "@/types/types";
import ScanCanvas from "../cameraScan/ScanCanvas";
import MonCanvas from "./MonCanvas";
import Path from "./path/Path";
import { PolygonSharedValue } from "./MonCanvas";
import { MonitoringDetailData } from "./MonitoringsPanel";
import { SamplingData, summarizeDetections, computeHealthPerPointFiltered } from "./samplingUtils";

const PANEL_SPRING = { damping: 18, stiffness: 180, mass: 0.6 };

type MonitoringDetailProps = {
  data: MonitoringDetailData;
  onClose: () => void;
};

export default function MonitoringDetail(props: MonitoringDetailProps) {
  const { monitoring, samplings } = props.data;
  const insets = useSafeAreaInsets();

  const [vertexIndex, setVertexIndex] = useState<number>(-1);
  const [selectedSample, setSelectedSample] = useState<SamplingData | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<string>("__all__");
  const [menuVisible, setMenuVisible] = useState(false);

  const vertexToEdit = useSharedValue<Point | null>(null);
  const animSamplesBottom = useSharedValue(-160);
  const animPolygonDisplace = useSharedValue(0);

  const polygonSharedData = useSharedValue<PolygonSharedValue>(monitoring.polygon || []);
  const samplingPathSharedData = useSharedValue<PolygonSharedValue>(monitoring.samplingPath || []);
  const healthPerSamplingPoint = useSharedValue<number[]>(computeHealthPerPointFiltered(samplings, null));

  useEffect(() => {
    healthPerSamplingPoint.value = computeHealthPerPointFiltered(samplings, selectedDisease === "__all__" ? null : selectedDisease);
  }, [selectedDisease]);

  const samplingPath = useRef(new Path(monitoring.samplingPath || []));
  const vertexIndexRef = useRef(-1);

  const summary = summarizeDetections(samplings);

  const handleTap = useCallback((point: Point) => {
    const vertex = samplingPath.current.getNearestVertexToGivenPoint(point);
    if (vertex) {
      const actualVertexIndex = samplingPathSharedData.value.findIndex((v) => v.id === vertex!.id);
      setVertexIndex(actualVertexIndex);
      vertexIndexRef.current = actualVertexIndex;
      vertexToEdit.set(vertex.getAsPoint());
      animSamplesBottom.value = withSpring(0, PANEL_SPRING);
      animPolygonDisplace.value = withSpring(70, PANEL_SPRING);
    } else {
      setVertexIndex(-1);
      vertexIndexRef.current = -1;
      vertexToEdit.set(null);
      animSamplesBottom.value = withSpring(-160, PANEL_SPRING);
      animPolygonDisplace.value = withSpring(0, PANEL_SPRING);
    }
  }, []);

  return (
    <>
      <View style={{ position: "absolute", width: "100%", height: "100%", bottom: 0, backgroundColor: "#fffbf0" }} />

      <Animated.View style={{ position: "absolute", width: "100%", height: "100%", bottom: animPolygonDisplace }}>
        <View style={{ position: "relative", width: "100%", height: "100%" }}>
          <MonCanvas
            polygonSharedData={polygonSharedData}
            samplingPathSharedData={samplingPathSharedData}
            healthPerSamplingPoint={healthPerSamplingPoint}
            markerPos={vertexToEdit}
            onTap={handleTap}
            samplingMode={true}
          />
        </View>
      </Animated.View>

      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          zIndex: 10,
          paddingHorizontal: 12,
        }}
      >
        <View
          style={{
            backgroundColor: "#fffef4",
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
            boxShadow: "0px 0px 4px 2px rgba(0, 0, 0, 0.25)",
            maxWidth: "85%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: MD3Colors.neutral30, fontSize: 18, fontWeight: "bold", textAlign: "center" }}>
            Monitoreo del {new Date(monitoring.created_at).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase())}
          </Text>
        </View>
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          zIndex: 10,
          paddingHorizontal: 12,
          paddingBottom: 12,
        }}
      >
        <View
          style={{
            backgroundColor: "#fffef4",
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
            boxShadow: "0px 0px 4px 2px rgba(0, 0, 0, 0.25)",
            maxWidth: "85%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: MD3Colors.neutral40, fontSize: 13, textAlign: "center", marginBottom: 6 }}>
            {summary.pointsWithSamples} de {samplingPathSharedData.value.length} puntos muestreados · {summary.totalSamples} muestras
          </Text>
          {summary.diseases.length > 0 ? (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setMenuVisible(true)}
                  style={{ backgroundColor: "#e8e8e0", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text style={{ color: MD3Colors.neutral30, fontSize: 13, fontWeight: "bold", flexShrink: 1 }} numberOfLines={1}>
                    {selectedDisease === "__all__" ? "Todas las enfermedades" : selectedDisease}
                  </Text>
                  <Icon source="menu-down" size={20} color={MD3Colors.neutral30} />
                </TouchableOpacity>
              }
              contentStyle={{ backgroundColor: "#fffef4", borderRadius: 8 }}
            >
              <Menu.Item
                onPress={() => { setSelectedDisease("__all__"); setMenuVisible(false); }}
                title="Todas las enfermedades"
                titleStyle={{ color: MD3Colors.neutral30 }}
                trailingIcon={selectedDisease === "__all__" ? "check" : undefined}
                style={{ borderBottomWidth: 1, borderBottomColor: "#e8e8e0" }}
              />
              {summary.diseases.map((disease) => (
                <Menu.Item
                  key={disease.name}
                  onPress={() => { setSelectedDisease(disease.name); setMenuVisible(false); }}
                  title={`${disease.name} (×${disease.count})`}
                  titleStyle={{ color: MD3Colors.neutral30 }}
                  trailingIcon={selectedDisease === disease.name ? "check" : undefined}
                />
              ))}
            </Menu>
          ) : (
            <View style={{ backgroundColor: "#dcefd6", borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10 }}>
              <Text style={{ color: "#2cac0f", fontSize: 12, fontWeight: "bold" }}>Sin detecciones de enfermedades</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ position: "absolute", left: 4, top: insets.top + 8, zIndex: 10 }}>
        <TouchableOpacity
          onPress={props.onClose}
          style={{
            backgroundColor: "white",
            borderRadius: 10,
            padding: 6,
            boxShadow: "0px 0px 4px 2px rgba(0, 0, 0, 0.4)",
          }}
        >
          <Icon source="arrow-left" size={28} color={MD3Colors.neutral30} />
        </TouchableOpacity>
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
          MUESTRAS DEL PUNTO SELECCIONADO ({samplings[vertexIndex]?.length || 0})
        </Text>

        <ScrollView
          style={{ width: "100%" }}
          contentContainerStyle={{ display: "flex", flexDirection: "row", gap: 10 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {samplings[vertexIndex]?.map((sample, index) => (
            <TouchableOpacity
              key={`${sample.photo_dir}-${index}`}
              onPress={() => setSelectedSample(sample)}
              style={{
                borderColor: "rgb(189, 109, 23)",
                borderWidth: 4,
                borderRadius: 10,
                width: 80,
                height: 80,
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
                backgroundColor: "white",
              }}
            >
              <Text style={{ color: MD3Colors.neutral30, fontSize: 20, fontWeight: "bold" }}>
                {sample.detection?.length}
              </Text>
              <Text style={{ color: MD3Colors.neutral30, fontSize: 12, textAlign: "center" }}>
                detección{sample.detection?.length === 1 ? "" : "es"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {selectedSample && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: "#fffeef", display: "flex", gap: 15 }}>
          <Text
            style={{
              color: MD3Colors.neutral30,
              marginHorizontal: "auto",
              fontSize: 24,
              marginTop: 15,
              zIndex: 10,
              backgroundColor: "#fffef4",
              paddingVertical: 5,
              paddingHorizontal: 8,
              borderRadius: 5,
            }}
          >
            Resultados de Reconocimiento
          </Text>
          <View style={{ flex: 2, display: "flex", alignItems: "center" }}>
            <ScanCanvas
              detection={selectedSample.detection}
              photoUri={selectedSample.photo_dir}
              useGestureHandler={true}
            />
          </View>
          <View style={{ display: "flex", flexDirection: "row", marginHorizontal: "auto", marginBottom: 15 }}>
            <TouchableOpacity
              onPress={() => setSelectedSample(null)}
              style={{ backgroundColor: "#5189d2", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28 }}
            >
              <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}