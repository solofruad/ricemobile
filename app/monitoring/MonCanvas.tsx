import { Point } from "@/types/types";
import { Canvas, ImageShader, matchFont, useImage, Skia, Path as SkPath} from "@shopify/react-native-skia";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, ToastAndroid, View, Text, Button } from "react-native";
import { IconButton, MD2Colors, MD3Colors} from "react-native-paper";
import { SharedValue, useDerivedValue, useSharedValue } from "react-native-reanimated";
import {Modal} from "react-native-reanimated-modal"
import GestureHandler from "./GestureHandler";
import History, { PATH_OP } from "./History";
import Path, { VERTEX_OPERATION } from "./Path";

import { Vibration } from 'react-native';
import Vertex from "./Vertex";

const rectPoints = [
                {x: 50, y: 200},
                {x: 350, y: 200},
                {x: 350, y: 500},
                {x: 50, y: 500}
              ];

const wPoints = [
  {x: 280, y: 250},
  {x: 110, y: 290},
  {x: 280, y: 350},
  {x: 110, y: 410},
  {x: 280, y: 450}
]

enum MONITOR_MODE{
  EDIT,     //Move and add vertexes
  DELETE,
  LOCK    //Edition disabled
}

export enum EDIT_PATH {
  NONE,     //Ninguno
  POLYGON,  //Terreno
  W_PATH    //Ruta de toma de muestras
}

type VertexSharedValue = {
    x:number,
    y:number,
    id:string
}
type PolygonSharedValue = Array<VertexSharedValue>

//* UI THREAD RELATED METHODS

const generatePath = (pointsList: PolygonSharedValue, isClosedPath: boolean)=>{
  "worklet";
  const skPath = Skia.Path.Make();
  const pts = pointsList;
  if (pts.length === 0) return skPath;

  skPath.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    skPath.lineTo(pts[i].x, pts[i].y);
  }
  if(isClosedPath)
    skPath.close();

  return skPath;
}
const generateHandlers = (pointsList: PolygonSharedValue) => {
  "worklet";
  const skPath = Skia.Path.Make();
  const pts = pointsList;
  if (pts.length === 0) return skPath;

  pts.forEach(v => {
    skPath.addCircle(v.x, v.y, 8); 
  });
  return skPath;
}

const fontStyle = {
  fontFamily: "arial",
  fontWeight: "bold",
  fontSize: 12
} as const;
const font = matchFont(fontStyle);

const generateVertexLabels = (pointsList: PolygonSharedValue) => {
  "worklet";
  const path = Skia.Path.Make();
  if (pointsList.length === 0) return path;

  pointsList.forEach((v) => {
    const textPath = Skia.Path.MakeFromText(v.id, 0, 0, font);
    if (textPath) {
      const matrix = Skia.Matrix();
      matrix.translate(v.x + 10, v.y - 10);
      textPath.transform(matrix);
      path.addPath(textPath);
    }
  });
  return path;
};

const isPointInsidePolygon = (pointsList: PolygonSharedValue, point: Point): boolean =>{
  let inside = false;
  const { x, y } = point;

  for (let i = 0, j = pointsList.length - 1; i < pointsList.length; j = i++) {
    const xi = pointsList[i].x, yi = pointsList[i].y;
    const xj = pointsList[j].x, yj = pointsList[j].y;

    // Check if the ray intersects with the edge between i and j
    const intersect = ((yi > y) !== (yj > y)) &&
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}



export default function MonCanvas() {
  const [modalVisible, setModalVisible] = useState(true);
  const [dims, setDims] = useState<{ x: number; y: number } | null>(null);
  const mode = useSharedValue<MONITOR_MODE>(MONITOR_MODE.EDIT);
  const [modeJS, setModeJS] = useState<MONITOR_MODE>(MONITOR_MODE.EDIT);
  const image = useImage(require('../../assets/textures/field.jpg'));
  
  useEffect(() => {
    setModalVisible(false);
    const screen = Dimensions.get("screen");
    setDims({
      x: screen.width,
      y: screen.height,
    });
    generateSharedValue();
  }, []);

  const vertexToEditId = useSharedValue<string | null>(null);
  const pathToEdit = useSharedValue<EDIT_PATH>(EDIT_PATH.NONE)
  const polygon = useRef(new Path(rectPoints)); //JS THREAD
  const wPath = useRef(new Path(wPoints)); //JS THREAD
  const history = useRef(new History());

  const polygonSharedData: SharedValue<PolygonSharedValue> = useSharedValue(([] as PolygonSharedValue)); //UI THREAD
  const wPathSharedData: SharedValue<PolygonSharedValue> = useSharedValue(([] as PolygonSharedValue)); //UI THREAD

  // Build the path dynamically based on vertex shared value
  const gPath = useDerivedValue(() => generatePath(polygonSharedData.value, true) ); //UI THREAD
  const gPathW = useDerivedValue(() => generatePath(wPathSharedData.value, false) ); //UI THREAD
  const gVertexes = useDerivedValue(() => generateHandlers(polygonSharedData.value) ); //UI THREAD
  const gVertexesW = useDerivedValue(() => generateHandlers(wPathSharedData.value) ); //UI THREAD
  const gLabels = useDerivedValue(() => generateVertexLabels(polygonSharedData.value)); //UI THREAD
  const gLabelsW = useDerivedValue(() => generateVertexLabels(wPathSharedData.value)); //UI THREAD

  
  const generateSharedValue = () =>{
    polygonSharedData.set( polygon.current.generateLinkedList() );
    wPathSharedData.set( wPath.current.generateLinkedList() );
  }

  const isOnePathInsideAnother = (outerPath: PolygonSharedValue, innerPath: PolygonSharedValue) =>{
    for (const vertex of innerPath) {
      if(!isPointInsidePolygon(outerPath,vertex))
        return false;
    }
    return true;
  }

  const handlePanStart = useCallback((point: Point) => {
    if(mode.value != MONITOR_MODE.EDIT)
      return;
    //Search near vertex in the polygon and the path
    let vertex;
    if(vertex = polygon.current.getNearestVertexToGivenPoint(point)){
      pathToEdit.value = EDIT_PATH.POLYGON;
    }else if(vertex = wPath.current.getNearestVertexToGivenPoint(point)){
      pathToEdit.value = EDIT_PATH.W_PATH;
    }else{
      pathToEdit.value = EDIT_PATH.NONE;
    }
    vertexToEditId.value = vertex ? vertex.id : null;
  }, []);

  const handlePan = useCallback((point: Point) => {
    'worklet';//Corre sobre el hilo de UI
    const sharedData = pathToEdit.value == EDIT_PATH.POLYGON ? polygonSharedData: wPathSharedData;
    if (vertexToEditId.value) {
      const currentData = [...sharedData.value];
      const index = currentData.findIndex(v => v.id === vertexToEditId.value);
      //the vertex array is mutating its id's
      if (index !== -1) {
        currentData[index] = { 
          ...currentData[index], 
          x: point.x, 
          y: point.y 
        };
        sharedData.value = currentData;
      }
    }
  }, []);

  const handlePanEnd = useCallback((point: Point) => {
    if(vertexToEditId.value && pathToEdit.value != EDIT_PATH.NONE){
      let before: Point | undefined;
      const sharedData = pathToEdit.value == EDIT_PATH.POLYGON ? polygonSharedData: wPathSharedData;
      const dataJS = pathToEdit.value == EDIT_PATH.POLYGON ? polygon: wPath;

      if( 
          ( pathToEdit.value == EDIT_PATH.POLYGON && isOnePathInsideAnother(polygonSharedData.value, wPathSharedData.value)) || 
          ( pathToEdit.value == EDIT_PATH.W_PATH && isPointInsidePolygon(polygonSharedData.value, point))
        ){
        before = dataJS.current.vertices.get(vertexToEditId.value)?.getAsPoint() as Point;
        dataJS.current = new Path( sharedData.value.map(v => ({ x: v.x, y: v.y, id: v.id })) );
      }else{  //If the Vertex movement wasn't valid
        Vibration.vibrate(50);
      }

      if(before){
        //know who moved and where (before and after move)
        history.current.addElement({  path: pathToEdit.value, 
                                      operation:PATH_OP.MOVE, 
                                      vertexId: vertexToEditId.value,
                                      before: before as Point,
                                      after: point})
      }
      vertexToEditId.value = null;
      generateSharedValue();
    }
  }, []);
  
  const handleTap = useCallback((point: Point) => {
    if(mode.value == MONITOR_MODE.LOCK)
      return;

    let pathToChange = EDIT_PATH.NONE;
    let result: VERTEX_OPERATION;

    if(mode.value == MONITOR_MODE.DELETE){
      let vertex: Vertex | null;
      if( vertex = polygon.current.getNearestVertexToGivenPoint(point) ){
        pathToChange = EDIT_PATH.POLYGON;
      }else if( vertex = wPath.current.getNearestVertexToGivenPoint(point) ){
        pathToChange = EDIT_PATH.W_PATH;
      }
      if(vertex){
        //console.log("Deleting vertex with id: ", vertex.id);
        const sharedData = pathToChange == EDIT_PATH.POLYGON ? polygonSharedData: wPathSharedData;

        const currentData = [...sharedData.value];
        const index = currentData.findIndex(v => v.id === vertex?.id);

        if (index !== -1) {
          currentData.splice(index, 1);
          sharedData.value = currentData;
        }

        let pathIsContained = true;
        const dataJS = pathToChange == EDIT_PATH.POLYGON ? polygon: wPath;
        dataJS.current.printVertexConections();

        if( pathToChange == EDIT_PATH.POLYGON && (pathIsContained = isOnePathInsideAnother(currentData, wPathSharedData.value)) ){  
          result = polygon.current.deleteVertex(vertex);
          //OK
        }else if( pathToChange == EDIT_PATH.W_PATH ){
          result = wPath.current.deleteVertex(vertex);
        }
        //@ts-ignore
        if(!pathIsContained || result != VERTEX_OPERATION.VERTEX_DELETED){  //If the Vertex deletion wasn't valid
          ToastAndroid.show("No se puede eliminar ese vértice", ToastAndroid.SHORT);
          Vibration.vibrate(50);
        }else{
          history.current.addElement({  path: pathToChange, 
                                        operation:PATH_OP.DELETE, 
                                        vertexId: dataJS.current.lastVertexDeleted?.id as string, //From JS Thread
                                        prevId: dataJS.current.lastEdgesEdited[0] as string, //From JS Thread
                                        nextId: dataJS.current.lastEdgesEdited[1] as string, //From JS Thread
                                        before: point});
          //console.log("W Path edges:", wPath.current.edges);
          dataJS.current.printVertexConections();
          //console.log("Linked List for W Path:", wPath.current.generateLinkedList());
        }
      }
      generateSharedValue();      
      return;
    }

    //EDITION LOGIC
    vertexToEditId.value = null; //? Que hace esto aca?
    if(( result = polygon.current.addVertexInPoint(point) ) == VERTEX_OPERATION.POINT_TOO_FAR_OF_PATH){
      if(isPointInsidePolygon(polygonSharedData.value, point) && (result = wPath.current.addVertexInPoint(point)) == VERTEX_OPERATION.VERTEX_ADDED){
        //Know  where added
        pathToChange = EDIT_PATH.W_PATH;
      }
    } else if(result == VERTEX_OPERATION.VERTEX_ADDED){
      //Know where added
      pathToChange = EDIT_PATH.POLYGON;
    }

    if(result == VERTEX_OPERATION.VERTEX_ADDED){
      const dataJS = pathToChange == EDIT_PATH.POLYGON ? polygon: wPath;
      dataJS.current.printVertexConections();
      history.current.addElement({  path: pathToChange, 
                operation:PATH_OP.INSERT, 
                vertexId: dataJS.current.lastVertexAdded?.id as string, //From JS Thread
                prevId: dataJS.current.lastEdgesEdited[0] as string, //From JS Thread
                nextId: dataJS.current.lastEdgesEdited[1] as string, //From JS Thread
                after: point});
      generateSharedValue();
      dataJS.current.printVertexConections();
    }
  }, []);

  const changeMode = (mo: MONITOR_MODE)=>{
    mode.value = mo;
    setModeJS(mo);
  }

  const colorBasedInMonitorMode = (desiredMode: MONITOR_MODE)=>{
    return modeJS == desiredMode ? MD2Colors.green600 : MD3Colors.neutral80;
  }


  if (dims && image) {
    return (<View style={{ flex: 1, display:"flex", flexDirection:"row" }}>
      <View style={{position:"absolute", width:"100%", height:"100%"}}>
        <LinearGradient
          colors={['#ffffff','#dffaff', '#0386CB', '#090979', '#020024']}
          style={{ flex: 1 }}
          locations={[0, 0.87, 0.9, 0.94, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
        
      <GestureHandler
        panStart={handlePanStart}
        pan={handlePan}
        panEnd={handlePanEnd}
        tap={handleTap}
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
          <SkPath path={gPath} color={"white"}  style="fill" >
            <ImageShader
              image={image}
              tx="repeat" // Horizontal tiling: 'repeat', 'mirror', or 'clamp'
              ty="repeat" // Vertical tiling: 'repeat', 'mirror', or 'clamp'
              rect={{ x: 0, y: 0, width: 250, height: 250 }}
              fit={"scaleDown"}
            />
          </SkPath>
          <SkPath path={gPath} color="brown" style="stroke" strokeWidth={4} />
          <SkPath path={gVertexes} color="orange" style="stroke" strokeWidth={3} />
          {/* FOR DEBUG */}
          <SkPath path={gPathW} color="#28d102" style="stroke" strokeWidth={5} />
          <SkPath path={gVertexesW} color="#8aea15" style="stroke" strokeWidth={4} />
          <SkPath path={gLabels} color="white" />
          <SkPath path={gLabelsW} color="white" />
        </Canvas>
      </GestureHandler>

      



      <View style={{display:"flex", flexDirection:"column",position:"absolute", left:4,bottom:4}}>
        <IconButton mode="outlined" iconColor={MD3Colors.neutral80} icon="undo" onPress={_=>{
          const res = history.current.undo(new Map([
            [EDIT_PATH.POLYGON,polygon.current],
            [EDIT_PATH.W_PATH,wPath.current]
          ]));

          if(res){
            const [pathEdited, path] = res;
            pathEdited == EDIT_PATH.POLYGON ? polygon.current = path : wPath.current = path;
            generateSharedValue();
          }
        }} />
      </View>

      <View style={{display:"flex", flexDirection:"column",position:"absolute", right:4,bottom:4}}>
        <Text style={{color:"white", fontSize:16, fontStyle:"italic", marginLeft:"auto", marginRight:4}}>
          {MONITOR_MODE.EDIT == modeJS ? "MOVER o AGREGAR PUNTO" : ""}
          {MONITOR_MODE.DELETE == modeJS ? "ELIMINAR PUNTO" : ""}
          {MONITOR_MODE.LOCK == modeJS ? "EDICIÓN BLOQUEADA" : ""}
        </Text>
        <View style={{display:"flex", flexDirection:"row", marginLeft:"auto"}}>   
          <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.EDIT)} icon="pencil" onPress={_=>changeMode(MONITOR_MODE.EDIT)} />

          <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.DELETE)} icon="trash-can-outline" onPress={_=>changeMode(MONITOR_MODE.DELETE)} />

          <IconButton mode="outlined" iconColor={MD3Colors.neutral80} icon="restart" onPress={()=>{ 
              setModalVisible(true);
            }} />

          <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.LOCK)} icon="check-outline" onPress={_=>changeMode(MONITOR_MODE.LOCK)} />
        </View>
      </View>

      <Modal visible={modalVisible} >
        <View
          style={{
            backgroundColor: 'white',
            padding: 20,
            borderRadius: 10,
            margin: 20,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "bold", marginHorizontal:"auto" }}>
            Reiniciar Trazado
          </Text>
          <Text style={{ fontSize: 16, textAlign:"center", marginVertical:30}}>Está seguro de que desea reiniciar el polígono?</Text>
          <View style={{display:"flex", flexDirection:"row", marginTop:10, marginHorizontal:"auto", gap:10}}>
            <Button title="Aceptar" onPress={() => {
              history.current = new History();
              polygon.current = new Path(rectPoints);
              wPath.current = new Path(wPoints);
              generateSharedValue(); 
              setModalVisible(false);
            }} />
            <Button title="Cancelar" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>

    </View>
    );
  }

  return <View style={{ backgroundColor: "#1c100fff" }} />;
}

/**
 * Para mostrar el poligono y mover los vectores estoy usando la shared memory (el poligono en el Hilo de la UI) 
 * que es el un array con los puntos del poligono
 * 
 * para editar el poligono (agregar vector, quitar vector, seleccionar el vector a correr) estoy usando una clase 
 * llamada Path la cual almacena los vectores y los Edges por separado (En el Hilo de JS)
 * 
 * la actualizacion de la posicion se realiza en tiempo real para la shared memory
 * 
 * cuando termina de moverse actualizo la representacion del poligono en el Hilo de JS
 * 
 * y cuando se hace la representacion del poligono en el Hilo de JS tengo que actualizar los cambios para la 
 * representtacion del poligono en el Hilo de UI
 */