import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, ToastAndroid, View, Text, Button, Vibration } from "react-native";
import { IconButton, MD2Colors, MD3Colors } from "react-native-paper";
import { Skia } from "@shopify/react-native-skia";
import { LinearGradient } from "expo-linear-gradient";
import { SharedValue, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { Modal } from "react-native-reanimated-modal";

import { Point } from "@/types/types";
import History, { PATH_OP } from "./path/History";
import Path, { VERTEX_OPERATION } from "./path/Path";
import Vertex from "./path/Vertex";
import MonCanvas from "./MonCanvas"; // Importamos el componente visual

const rectPoints = [
  { x: 50, y: 200 },
  { x: 350, y: 200 },
  { x: 350, y: 500 },
  { x: 50, y: 500 },
];

const wPoints = [
  { x: 280, y: 250 },
  { x: 110, y: 290 },
  { x: 280, y: 350 },
  { x: 110, y: 410 },
  { x: 280, y: 450 },
];

enum MONITOR_MODE {
  EDIT,
  DELETE,
  LOCK,
}

export enum EDIT_PATH {
  NONE,
  POLYGON,
  W_PATH,
}

type VertexSharedValue = { x: number; y: number; id: string };
type PolygonSharedValue = Array<VertexSharedValue>;

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

const isPointInsidePolygon = (pointsList: PolygonSharedValue, point: Point): boolean => {
  let inside = false;
  const { x, y } = point;

  for (let i = 0, j = pointsList.length - 1; i < pointsList.length; j = i++) {
    const xi = pointsList[i].x, yi = pointsList[i].y;
    const xj = pointsList[j].x, yj = pointsList[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
};

export default function MonEdit() {
  const [modalVisible, setModalVisible] = useState(true);
  const [dims, setDims] = useState<{ x: number; y: number } | null>(null);
  const [showWVertexInfluenceJS, setShowWVertexInfluenceJS] = useState(false);
  const [modeJS, setModeJS] = useState<MONITOR_MODE>(MONITOR_MODE.EDIT);

  const showWVertexInfluence = useSharedValue(false);
  const mode = useSharedValue<MONITOR_MODE>(MONITOR_MODE.EDIT);

  const vertexToEditId = useSharedValue<string | null>(null);
  const pathToEdit = useSharedValue<EDIT_PATH>(EDIT_PATH.NONE);
  
  const polygon = useRef(new Path(rectPoints));
  const wPath = useRef(new Path(wPoints));
  const history = useRef(new History());

  const polygonSharedData = useSharedValue<PolygonSharedValue>([]);
  const wPathSharedData = useSharedValue<PolygonSharedValue>([]);

  // Trazados dinámicos mediante Derived values heredados en el Hilo de la UI
  const gPath = useDerivedValue(() => generatePath(polygonSharedData.value, true));
  const gPathW = useDerivedValue(() => generatePath(wPathSharedData.value, false));
  const gVertexes = useDerivedValue(() => generateHandlers(polygonSharedData.value));
  const gVertexesW = useDerivedValue(() => generateHandlers(wPathSharedData.value, showWVertexInfluence.value));

  const generateSharedValue = () => {
    polygonSharedData.set(polygon.current.generateLinkedList());
    wPathSharedData.set(wPath.current.generateLinkedList());
  };

  useEffect(() => {
    setModalVisible(false);
    const screen = Dimensions.get("screen");
    setDims({ x: screen.width, y: screen.height });
    generateSharedValue();
  }, []);

  const isOnePathInsideAnother = (outerPath: PolygonSharedValue, innerPath: PolygonSharedValue) => {
    for (const vertex of innerPath) {
      if (!isPointInsidePolygon(outerPath, vertex)) return false;
    }
    return true;
  };

  // MANEJADORES DE GESTOS (Pasados a MonCanvas)
  const handlePanStart = useCallback((point: Point) => {
    if (mode.value !== MONITOR_MODE.EDIT) return;
    let vertex;
    if ((vertex = polygon.current.getNearestVertexToGivenPoint(point))) {
      pathToEdit.value = EDIT_PATH.POLYGON;
    } else if ((vertex = wPath.current.getNearestVertexToGivenPoint(point))) {
      pathToEdit.value = EDIT_PATH.W_PATH;
    } else {
      pathToEdit.value = EDIT_PATH.NONE;
    }
    vertexToEditId.value = vertex ? vertex.id : null;
  }, []);

  const handlePan = useCallback((point: Point) => {
    "worklet";
    const sharedData = pathToEdit.value === EDIT_PATH.POLYGON ? polygonSharedData : wPathSharedData;
    if (vertexToEditId.value) {
      const currentData = [...sharedData.value];
      const index = currentData.findIndex((v) => v.id === vertexToEditId.value);
      if (index !== -1) {
        currentData[index] = { ...currentData[index], x: point.x, y: point.y };
        sharedData.value = currentData;
      }
    }
  }, []);

  const handlePanEnd = useCallback((point: Point) => {
    if (vertexToEditId.value && pathToEdit.value !== EDIT_PATH.NONE) {
      let before: Point | undefined;
      const sharedData = pathToEdit.value === EDIT_PATH.POLYGON ? polygonSharedData : wPathSharedData;
      const dataJS = pathToEdit.value === EDIT_PATH.POLYGON ? polygon : wPath;

      if (
        (pathToEdit.value === EDIT_PATH.POLYGON && isOnePathInsideAnother(polygonSharedData.value, wPathSharedData.value)) ||
        (pathToEdit.value === EDIT_PATH.W_PATH && isPointInsidePolygon(polygonSharedData.value, point))
      ) {
        before = dataJS.current.vertices.get(vertexToEditId.value)?.getAsPoint() as Point;
        dataJS.current = new Path(sharedData.value.map((v) => ({ x: v.x, y: v.y, id: v.id })));
      } else {
        Vibration.vibrate(50);
      }

      if (before) {
        history.current.addElement({
          path: pathToEdit.value,
          operation: PATH_OP.MOVE,
          vertexId: vertexToEditId.value,
          before: before as Point,
          after: point,
        });
      }
      vertexToEditId.value = null;
      generateSharedValue();
    }
  }, []);

  const handleTap = useCallback((point: Point) => {
    if (mode.value === MONITOR_MODE.LOCK) return;

    let pathToChange = EDIT_PATH.NONE;
    let result: VERTEX_OPERATION;

    if (mode.value === MONITOR_MODE.DELETE) {
      let vertex: Vertex | null;
      if ((vertex = polygon.current.getNearestVertexToGivenPoint(point))) {
        pathToChange = EDIT_PATH.POLYGON;
      } else if ((vertex = wPath.current.getNearestVertexToGivenPoint(point))) {
        pathToChange = EDIT_PATH.W_PATH;
      }
      if (vertex) {
        const sharedData = pathToChange === EDIT_PATH.POLYGON ? polygonSharedData : wPathSharedData;
        const currentData = [...sharedData.value];
        const index = currentData.findIndex((v) => v.id === vertex?.id);

        if (index !== -1) {
          currentData.splice(index, 1);
          sharedData.value = currentData;
        }

        let pathIsContained = true;
        const dataJS = pathToChange === EDIT_PATH.POLYGON ? polygon : wPath;

        if (pathToChange === EDIT_PATH.POLYGON && (pathIsContained = isOnePathInsideAnother(currentData, wPathSharedData.value))) {
          result = polygon.current.deleteVertex(vertex);
        } else if (pathToChange === EDIT_PATH.W_PATH) {
          result = wPath.current.deleteVertex(vertex);
        }
        
        //@ts-ignore
        if (!pathIsContained || result !== VERTEX_OPERATION.VERTEX_DELETED) {
          ToastAndroid.show("No se puede eliminar ese vértice", ToastAndroid.SHORT);
          Vibration.vibrate(50);
        } else {
          history.current.addElement({
            path: pathToChange,
            operation: PATH_OP.DELETE,
            vertexId: dataJS.current.lastVertexDeleted?.id as string,
            prevId: dataJS.current.lastEdgesEdited[0] as string,
            nextId: dataJS.current.lastEdgesEdited[1] as string,
            before: point,
          });
        }
      }
      generateSharedValue();
      return;
    }

    vertexToEditId.value = null;
    if ((result = polygon.current.addVertexInPoint(point)) === VERTEX_OPERATION.POINT_TOO_FAR_OF_PATH) {
      if (isPointInsidePolygon(polygonSharedData.value, point) && (result = wPath.current.addVertexInPoint(point)) === VERTEX_OPERATION.VERTEX_ADDED) {
        pathToChange = EDIT_PATH.W_PATH;
      }
    } else if (result === VERTEX_OPERATION.VERTEX_ADDED) {
      pathToChange = EDIT_PATH.POLYGON;
    }

    if (result === VERTEX_OPERATION.VERTEX_ADDED) {
      const dataJS = pathToChange === EDIT_PATH.POLYGON ? polygon : wPath;
      history.current.addElement({
        path: pathToChange,
        operation: PATH_OP.INSERT,
        vertexId: dataJS.current.lastVertexAdded?.id as string,
        prevId: dataJS.current.lastEdgesEdited[0] as string,
        nextId: dataJS.current.lastEdgesEdited[1] as string,
        after: point,
      });
      generateSharedValue();
    }
  }, []);

  const changeMode = (mo: MONITOR_MODE) => {
    mode.value = mo;
    setModeJS(mo);
  };

  const toggleWVertexInfluence = () => {
    ToastAndroid.show(!showWVertexInfluence.value ? "Áreas de influencia activadas" : "Áreas de influencia desactivadas", ToastAndroid.SHORT);
    setShowWVertexInfluenceJS(!showWVertexInfluence.value);
    showWVertexInfluence.value = !showWVertexInfluence.value;
  };

  const colorBasedInMonitorMode = (desiredMode: MONITOR_MODE) => {
    return modeJS === desiredMode ? MD2Colors.green600 : MD3Colors.neutral80;
  };

  return (
    <View style={{ flex: 1, display: "flex", flexDirection: "row" }}>
      <View style={{ position: "absolute", width: "100%", height: "100%" }}>
        <LinearGradient
          colors={["#ffffff", "#dffaff", "#0386CB", "#090979", "#020024"]}
          style={{ flex: 1 }}
          locations={[0, 0.87, 0.9, 0.94, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* RENDERIZADO DEL CANVAS SEPARADO */}
      <MonCanvas
        dims={dims}
        gPath={gPath}
        gPathW={gPathW}
        gVertexes={gVertexes}
        gVertexesW={gVertexesW}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onTap={handleTap}
      />

      {/* BOTÓN DESHACER (UNDO) */}
      <View style={{ display: "flex", flexDirection: "column", position: "absolute", left: 4, bottom: 4 }}>
        <IconButton
          mode="outlined"
          iconColor={MD3Colors.neutral80}
          icon="undo"
          onPress={() => {
            const res = history.current.undo(
              new Map([
                [EDIT_PATH.POLYGON, polygon.current],
                [EDIT_PATH.W_PATH, wPath.current],
              ])
            );

            if (res) {
              const [pathEdited, path] = res;
              pathEdited === EDIT_PATH.POLYGON ? (polygon.current = path) : (wPath.current = path);
              generateSharedValue();
            }
          }}
        />
      </View>

      {/* PANEL DE ACCIONES Y MODOS */}
      <View style={{ display: "flex", flexDirection: "column", position: "absolute", right: 4, bottom: 4 }}>
        <Text style={{ color: "white", fontSize: 16, fontStyle: "italic", marginLeft: "auto", marginRight: 4 }}>
          {MONITOR_MODE.EDIT === modeJS ? "MOVER o AGREGAR PUNTO" : ""}
          {MONITOR_MODE.DELETE === modeJS ? "ELIMINAR PUNTO" : ""}
          {MONITOR_MODE.LOCK === modeJS ? "EDICIÓN BLOQUEADA" : ""}
        </Text>
        <View style={{ display: "flex", flexDirection: "row", marginLeft: "auto" }}>
          <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.EDIT)} icon="pencil" onPress={() => changeMode(MONITOR_MODE.EDIT)} />
          <IconButton mode="outlined" iconColor={showWVertexInfluenceJS ? MD2Colors.green600 : MD3Colors.neutral80} icon="texture-box" onPress={toggleWVertexInfluence} />
          <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.DELETE)} icon="trash-can-outline" onPress={() => changeMode(MONITOR_MODE.DELETE)} />
          <IconButton mode="outlined" iconColor={MD3Colors.neutral80} icon="restart" onPress={() => setModalVisible(true)} />
          <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.LOCK)} icon="check-outline" onPress={() => changeMode(MONITOR_MODE.LOCK)} />
        </View>
      </View>

      {/* MODAL DE REINICIO */}
      <Modal visible={modalVisible}>
        <View style={{ backgroundColor: "white", padding: 20, borderRadius: 10, margin: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", marginHorizontal: "auto" }}>Reiniciar Trazado</Text>
          <Text style={{ fontSize: 16, textAlign: "center", marginVertical: 30 }}>¿Está seguro de que desea reiniciar el polígono?</Text>
          <View style={{ display: "flex", flexDirection: "row", marginTop: 10, marginHorizontal: "auto", gap: 10 }}>
            <Button
              title="Aceptar"
              onPress={() => {
                history.current = new History();
                polygon.current = new Path(rectPoints);
                wPath.current = new Path(wPoints);
                generateSharedValue();
                setModalVisible(false);
              }}
            />
            <Button title="Cancelar" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}