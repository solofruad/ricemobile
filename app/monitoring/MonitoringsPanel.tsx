import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Icon, MD3Colors } from "react-native-paper";
import Animated, { useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MonitoringsTable, { MonitoringsWithDrawingRecord } from "@/database/tables/MonitoringsTable";
import SamplingsTable from "@/database/tables/SamplingsTable";
import { buildSamplingsMatrix, SamplingData, summarizeDetections } from "./samplingUtils";

const PANEL_SPRING = { damping: 18, stiffness: 180, mass: 0.6 };

export type MonitoringDetailData = {
  monitoring: MonitoringsWithDrawingRecord;
  samplings: SamplingData[][];
};

type MonitoringsPanelProps = {
  visible: boolean;
  onClose: () => void;
  onSelectMonitoring: (data: MonitoringDetailData) => void;
};

const formatDate = (createdAt: string) => {
  const [datePart, timePart] = createdAt.split(" ");
  return { date: datePart, time: timePart?.slice(0, 5) || "" };
};

export default function MonitoringsPanel(props: MonitoringsPanelProps) {
  const [items, setItems] = useState<MonitoringDetailData[]>([]);
  const [loading, setLoading] = useState(false);

  const panelWidth = Dimensions.get("window").width * 0.85;
  const translateX = useSharedValue(panelWidth);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    translateX.value = withSpring(props.visible ? 0 : panelWidth, PANEL_SPRING);
    if (props.visible) loadMonitorings();
  }, [props.visible]);

  const loadMonitorings = useCallback(() => {
    setLoading(true);
    MonitoringsTable.getProcessedWithDrawing()
      .then(async (monitorings) => {
        const details = await Promise.all(
          monitorings.map(async (monitoring) => {
            const records = await SamplingsTable.getByMonitoringId(monitoring.id);
            return { monitoring, samplings: buildSamplingsMatrix(records) };
          })
        );
        setItems(details);
      })
      .catch((error) => console.error("Error al cargar los monitoreos", error))
      .finally(() => setLoading(false));
  }, []);

  const grouped: Array<{ date: string; items: MonitoringDetailData[] }> = [];
  items.forEach((item) => {
    const { date } = formatDate(item.monitoring.created_at);
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.items.push(item);
    } else {
      grouped.push({ date, items: [item] });
    }
  });

  return (
    <>
      {props.visible && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={props.onClose}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 45, backgroundColor: "rgba(0,0,0,0.4)" }}
        />
      )}

      <Animated.View
        style={{
          position: "absolute",
          top: insets.top,
          bottom: 0,
          right: 0,
          width: panelWidth,
          zIndex: 46,
          transform: [{ translateX }],
          backgroundColor: "#fffbf0",
          boxShadow: [
            {
              offsetX: -4,
              offsetY: 0,
              blurRadius: 8,
              spreadDistance: 2,
              color: "rgba(0,0,0,0.4)",
              inset: false,
            },
          ],
          paddingVertical: 10,
          paddingHorizontal: 12,
        }}
      >
        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ color: MD3Colors.neutral30, fontSize: 18, fontWeight: "bold" }}>MONITOREOS REALIZADOS</Text>
          <TouchableOpacity onPress={props.onClose}>
            <Icon source="close" size={28} color={MD3Colors.neutral30} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={MD3Colors.neutral30} />
          </View>
        ) : grouped.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: MD3Colors.neutral40, fontSize: 15, fontStyle: "italic", textAlign: "center" }}>
              No hay monitoreos procesados todavía.
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {grouped.map((group) => (
              <View key={group.date} style={{ marginBottom: 12 }}>
                <Text style={{ color: MD3Colors.neutral40, fontSize: 14, fontWeight: "bold", marginBottom: 6 }}>
                  {group.date}
                </Text>
                {group.items.map((item) => {
                  const summary = summarizeDetections(item.samplings);
                  const { time } = formatDate(item.monitoring.created_at);
                  return (
                    <TouchableOpacity
                      key={item.monitoring.id}
                      onPress={() => props.onSelectMonitoring(item)}
                      style={{
                        backgroundColor: "white",
                        borderRadius: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        marginBottom: 6,
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        // justifyContent: "space-between",
                        boxShadow: "0px 0px 3px 1px rgba(0, 0, 0, 0.15)",
                      }}
                    >
                      <View style={{ flex: 1}}>
                        <Text style={{ color: MD3Colors.neutral30, fontSize: 16, fontWeight: "bold" }}>{time}</Text>
                        <Text style={{ color: MD3Colors.neutral40, fontSize: 13, marginTop: 2 }}>
                          {summary.totalSamples} muestra{summary.totalSamples === 1 ? "" : "s"} ·{" "}
                          {summary.pointsWithSamples} punto{summary.pointsWithSamples === 1 ? "" : "s"} ·{" "}
                          {summary.diseases.length > 0
                            ? `${summary.diseases.length} enfermedad${summary.diseases.length === 1 ? "" : "es"} detectada${summary.diseases.length === 1 ? "" : "s"}`
                            : "sin detecciones"}
                        </Text>
                      </View>
                      <View>
                        <Icon source="chevron-right" size={24} color={MD3Colors.neutral40} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </>
  );
}