import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Dimensions, LayoutChangeEvent, Text, ToastAndroid, Vibration, View } from "react-native";
import { MD2Colors, MD3Colors } from "react-native-paper";
import { useSharedValue } from "react-native-reanimated";
import { Modal } from "react-native-reanimated-modal";

import { Point } from "@/types/types";
import MonCanvas from "./MonCanvas"; // Importamos el componente visual
import EditorActionButton from "./components/EditorActionButton";
import EditorPanel from "./components/EditorPanel";
import MonGuide from "./components/MonGuide";
import History, { PATH_OP } from "./path/History";
import Path, { VERTEX_OPERATION } from "./path/Path";
import Vertex from "./path/Vertex";
import MonitorDrawingsTable, { MonitorDrawingRecord } from "@/database/tables/MonitorDrawingsTable";

export type MonitorDrawingData = {
  polygon: PolygonSharedValue;
  samplingPath: PolygonSharedValue;
}

const BOUNDS = {
  top:50,
  bottom:86,
  left:15,
  right:15
}

const polygonBasePoints = [
  { x: 50, y: 200 },
  { x: 350, y: 200 },
  { x: 350, y: 500 },
  { x: 50, y: 500 },
];

const samplingPathBasePoints = [
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

export type VertexSharedValue = { x: number; y: number; id: string };
export type PolygonSharedValue = Array<VertexSharedValue>;

type MonEditProps = {
  tryGoToSamplingMode: ()=>void;
  drawingData: MonitorDrawingRecord | null;
}

export default function MonEdit(props: MonEditProps) {
  const dims = useRef<{ x: number; y: number }>({x:0,y:0});
  const [showEditEndModal, setShowEditEndModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showWVertexInfluenceJS, setShowWVertexInfluenceJS] = useState(false);
  const [modeJS, setModeJS] = useState<MONITOR_MODE>(MONITOR_MODE.EDIT);

  const showWVertexInfluence = useSharedValue(false);
  const mode = useSharedValue<MONITOR_MODE>(MONITOR_MODE.EDIT);

  const vertexToEditId = useSharedValue<string | null>(null);
  const pathToEdit = useSharedValue<EDIT_PATH>(EDIT_PATH.NONE);
  
  const polygon = useRef(new Path(props.drawingData?.polygon || polygonBasePoints));
  const samplingPath = useRef(new Path(props.drawingData?.samplingPath || samplingPathBasePoints));
  const history = useRef(new History());

  const polygonSharedData = useSharedValue<PolygonSharedValue>([]);
  const samplingPathSharedData = useSharedValue<PolygonSharedValue>([]);

  const generateSharedValue = () => {
    polygonSharedData.set(polygon.current.generateLinkedList());
    samplingPathSharedData.set(samplingPath.current.generateLinkedList());
  };

  useEffect(() => {
    generateSharedValue();
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    dims.current = { x:width, y:height };
  };

  const isPointInsideBounds = (point: Point)=>{
    return  point.x > BOUNDS.left && 
            point.x < dims.current.x -BOUNDS.right &&
            point.y > BOUNDS.top &&
            point.y < dims.current.y - BOUNDS.bottom
  }

  // MANEJADORES DE GESTOS (Pasados a MonCanvas)
  const handlePanStart = useCallback((point: Point) => {
    if (mode.value !== MONITOR_MODE.EDIT) return;
    let vertex;
    if ((vertex = polygon.current.getNearestVertexToGivenPoint(point))) {
      pathToEdit.value = EDIT_PATH.POLYGON;
    } else if ((vertex = samplingPath.current.getNearestVertexToGivenPoint(point))) {
      pathToEdit.value = EDIT_PATH.W_PATH;
    } else {
      pathToEdit.value = EDIT_PATH.NONE;
    }
    vertexToEditId.value = vertex ? vertex.id : null;
  }, []);

  const handlePan = useCallback((point: Point) => {
    "worklet";
    const sharedData = pathToEdit.value === EDIT_PATH.POLYGON ? polygonSharedData : samplingPathSharedData;
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
      const sharedData = pathToEdit.value === EDIT_PATH.POLYGON ? polygonSharedData : samplingPathSharedData;
      const dataJS = pathToEdit.value === EDIT_PATH.POLYGON ? polygon : samplingPath;

      if ((
          (pathToEdit.value === EDIT_PATH.POLYGON && Path.isOnePathInsideAnother(polygonSharedData.value, samplingPathSharedData.value)) ||
          (pathToEdit.value === EDIT_PATH.W_PATH && Path.isPointInsidePolygon(polygonSharedData.value, point))
        ) && isPointInsideBounds(point)
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
      } else if ((vertex = samplingPath.current.getNearestVertexToGivenPoint(point))) {
        pathToChange = EDIT_PATH.W_PATH;
      }
      if (vertex) {
        const sharedData = pathToChange === EDIT_PATH.POLYGON ? polygonSharedData : samplingPathSharedData;
        const currentData = [...sharedData.value];
        const index = currentData.findIndex((v) => v.id === vertex?.id);

        if (index !== -1) {
          currentData.splice(index, 1);
          sharedData.value = currentData;
        }

        let pathIsContained = true;
        const dataJS = pathToChange === EDIT_PATH.POLYGON ? polygon : samplingPath;

        if (pathToChange === EDIT_PATH.POLYGON && (pathIsContained = Path.isOnePathInsideAnother(currentData, samplingPathSharedData.value))) {
          result = polygon.current.deleteVertex(vertex);
        } else if (pathToChange === EDIT_PATH.W_PATH) {
          result = samplingPath.current.deleteVertex(vertex);
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
      if (Path.isPointInsidePolygon(polygonSharedData.value, point) && (result = samplingPath.current.addVertexInPoint(point)) === VERTEX_OPERATION.VERTEX_ADDED) {
        pathToChange = EDIT_PATH.W_PATH;
      }
    } else if (result === VERTEX_OPERATION.VERTEX_ADDED) {
      pathToChange = EDIT_PATH.POLYGON;
    }

    if (result === VERTEX_OPERATION.VERTEX_ADDED) {
      const dataJS = pathToChange === EDIT_PATH.POLYGON ? polygon : samplingPath;
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
    if (mo === MONITOR_MODE.LOCK)
      setShowEditEndModal(true);
  };

  const toggleWVertexInfluence = () => {
    ToastAndroid.show(!showWVertexInfluence.value ? "Áreas de influencia activadas" : "Áreas de influencia desactivadas", ToastAndroid.SHORT);
    setShowWVertexInfluenceJS(!showWVertexInfluence.value);
    showWVertexInfluence.value = !showWVertexInfluence.value;
  };

  const colorBasedInMonitorMode = (desiredMode: MONITOR_MODE) => {
    return modeJS === desiredMode ? MD2Colors.green600 : MD3Colors.neutral40;
  };

  const undoAction = ()=>{
    const res = history.current.undo(
      new Map([
        [EDIT_PATH.POLYGON, polygon.current],
        [EDIT_PATH.W_PATH, samplingPath.current],
      ])
    );

    if (res) {
      const [pathEdited, path] = res;
      pathEdited === EDIT_PATH.POLYGON ? (polygon.current = path) : (samplingPath.current = path);
      generateSharedValue();
    }
  }

  return (
    <>
      <View onLayout={handleLayout} style={{ position: "absolute", width: "100%", height: "100%", bottom:0, backgroundColor:"#fffbf0" }}/>

      {/* RENDERIZADO DEL CANVAS SEPARADO */}
      <MonCanvas
        polygonSharedData={polygonSharedData}
        samplingPathSharedData={samplingPathSharedData}
        showWVertexInfluence={showWVertexInfluence}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onTap={handleTap}
      />

      <Text style={{ position:"absolute", width:"100%", textAlign:"right", bottom:60, right:4,  color: MD3Colors.neutral30, fontSize: 16, fontStyle: "italic" }}>
        {MONITOR_MODE.EDIT === modeJS ? "MOVER o AGREGAR PUNTO" : ""}
        {MONITOR_MODE.DELETE === modeJS ? "ELIMINAR PUNTO" : ""}
        {MONITOR_MODE.LOCK === modeJS ? "EDICIÓN BLOQUEADA" : ""}
      </Text>

      {/* BOTÓN AYUDA */}
      <View style={{ position: "absolute", right: 4, top: 35 }}>
        <EditorPanel>
          <EditorActionButton icon="help" action={() => setShowGuide(true)} />
        </EditorPanel>
      </View>

      {/* BOTÓN DESHACER (UNDO) */}
      <View style={{ position: "absolute", left: 4, bottom: 6 }}>
        <EditorPanel>
          <EditorActionButton icon="restart" action={() => setShowResetModal(true)} />
          <EditorActionButton icon="undo" action={undoAction} />
        </EditorPanel>
      </View>

      {/* PANEL DE ACCIONES Y MODOS */}
      <View style={{ position: "absolute", right: 4, bottom: 6 }}>
        <EditorPanel flexDirection="row">
          <EditorActionButton iconColor={colorBasedInMonitorMode(MONITOR_MODE.EDIT)} icon="pencil" action={() => changeMode(MONITOR_MODE.EDIT)} />
          <EditorActionButton iconColor={showWVertexInfluenceJS ? MD2Colors.green600 : MD3Colors.neutral40} icon="texture-box" action={toggleWVertexInfluence} />
          <EditorActionButton iconColor={colorBasedInMonitorMode(MONITOR_MODE.DELETE)} icon="trash-can-outline" action={() => changeMode(MONITOR_MODE.DELETE)} />
          <EditorActionButton iconColor={colorBasedInMonitorMode(MONITOR_MODE.LOCK)} icon="check-outline" action={() => changeMode(MONITOR_MODE.LOCK)} />
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
          <Text style={{ fontSize: 16, textAlign: "center", marginVertical: 30 }}>¿Está seguro de que desea reiniciar el polígono?</Text>
          <View style={{ display: "flex", flexDirection: "row", marginTop: 10, marginHorizontal: "auto", gap: 10 }}>
            <Button
              title="Aceptar"
              onPress={() => {
                history.current = new History();
                polygon.current = new Path(polygonBasePoints);
                samplingPath.current = new Path(samplingPathBasePoints);
                generateSharedValue();
                setShowResetModal(false);
              }}
            />
            <Button title="Cancelar" onPress={() => setShowResetModal(false)} />
          </View>
        </View>
      </Modal>

      {/*MODAL DE FIN DE EDICION E INICIO DEL MONITOREO*/}
      <Modal visible={showEditEndModal} onBackdropPress={()=>setShowEditEndModal(false)}>
        <View style={{ backgroundColor: "white", padding: 20, borderRadius: 10, margin: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", marginHorizontal: "auto", marginBottom: 5 }}>Iniciar Monitoreo</Text>
          <Text style={{ fontSize: 16, textAlign: "center", marginVertical: 10 }}>
            ¿Desea iniciar el monitoreo con el trazado actual?
          </Text>
          <Text style={{ fontSize: 15, textAlign: "center", marginVertical: 5, color: MD3Colors.neutral40 }}>
            El trazado no podrá ser editado una vez iniciado el monitoreo, pero podrá ser visualizado y utilizado para el seguimiento.
          </Text>
          <View style={{ display: "flex", flexDirection: "column", marginTop: 25,  marginBottom:10, marginHorizontal: "auto", gap: 10 }}>
            <Button
              title="Sí, iniciar monitoreo"
              onPress={() => {
                // Aquí iría la lógica para iniciar el monitoreo con el trazado actual
                setShowEditEndModal(false);
                MonitorDrawingsTable.insert({
                  polygon: polygon.current.generateLinkedList(),
                  samplingPath: samplingPath.current.generateLinkedList(),
                  })
                  .then(_=>{props.tryGoToSamplingMode()});
              }}
            />
            <Button title="No, seguir editando" onPress={() => setShowEditEndModal(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}