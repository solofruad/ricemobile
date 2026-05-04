import { Point } from "@/types/types";
import { Canvas, matchFont, Skia, Path as SkPath } from "@shopify/react-native-skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, ToastAndroid, View } from "react-native";
import { IconButton, MD2Colors, MD3Colors } from "react-native-paper";
import { SharedValue, useDerivedValue, useSharedValue } from "react-native-reanimated";
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
  const [dims, setDims] = useState<{ x: number; y: number } | null>(null);
  const mode = useSharedValue<MONITOR_MODE>(MONITOR_MODE.EDIT);
  const [modeJS, setModeJS] = useState<MONITOR_MODE>(MONITOR_MODE.EDIT);
  useEffect(() => {
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
  // const gLabels = useDerivedValue(() => generateVertexLabels(polygonSharedData.value)); //UI THREAD
  // const gLabelsW = useDerivedValue(() => generateVertexLabels(wPathSharedData.value)); //UI THREAD

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
        // console.warn(vertexToEditId.value);
        // console.warn(dataJS.current.vertices);
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
        const sharedData = pathToChange == EDIT_PATH.POLYGON ? polygonSharedData: wPathSharedData;

        const currentData = [...sharedData.value];
        const index = currentData.findIndex(v => v.id === vertex?.id);

        if (index !== -1) {
          currentData.splice(index, 1);
          sharedData.value = currentData;
        }

        let pathIsContained = true;

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
          const dataJS = pathToChange == EDIT_PATH.POLYGON ? polygon: wPath;
          dataJS.current.printVertexConections();
          history.current.addElement({  path: pathToChange, 
                                        operation:PATH_OP.DELETE, 
                                        vertexId: dataJS.current.lastVertexDeleted?.id as string, //From JS Thread
                                        prevId: dataJS.current.lastEdgesEdited[0] as string, //From JS Thread
                                        nextId: dataJS.current.lastEdgesEdited[1] as string, //From JS Thread
                                        before: point});
          dataJS.current.printVertexConections();
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
    // console.log(`Monitor mode now: ${mode.value}`);
  }

  const colorBasedInMonitorMode = (desiredMode: MONITOR_MODE)=>{
    return modeJS == desiredMode ? MD2Colors.lightGreen700 : MD3Colors.neutral80;
  }


  if (dims) {
    return (<>
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
            backgroundColor: "black",
            marginTop: "auto",
            marginBottom: "auto",
            position: "relative",
          }}
        >
          <SkPath path={gPath} color="lightblue" style="fill" />
          <SkPath path={gPath} color="brown" style="stroke" strokeWidth={4} />
          <SkPath path={gVertexes} color="orange" style="stroke" strokeWidth={3} />
          <SkPath path={gPathW} color="green" style="stroke" strokeWidth={4} />
          <SkPath path={gVertexesW} color="lime" style="stroke" strokeWidth={3} />

          {/* FOR DEBUG */}
          {/* <SkPath path={gLabels} color="white" />
          <SkPath path={gLabelsW} color="white" /> */}
        </Canvas>
      </GestureHandler>


      <View style={{display:"flex", flexDirection:"column",position:"absolute", left:5,bottom:5}}>
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

      <View style={{display:"flex", flexDirection:"column",position:"absolute", right:5,bottom:5}}>
        <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.EDIT)} icon="pencil" onPress={_=>changeMode(MONITOR_MODE.EDIT)} />

        <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.DELETE)} icon="trash-can-outline" onPress={_=>changeMode(MONITOR_MODE.DELETE)} />

        <IconButton mode="outlined" iconColor={MD3Colors.neutral80} icon="restart" onPress={()=>{ 
          history.current = new History();
          polygon.current = new Path(rectPoints);
          wPath.current = new Path(wPoints);
          generateSharedValue(); 
          }} />

        {/* <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.LOCK)} icon="lock" onPress={_=>changeMode(MONITOR_MODE.LOCK)} /> */}
        <IconButton mode="outlined" iconColor={colorBasedInMonitorMode(MONITOR_MODE.LOCK)} icon="check-outline" onPress={_=>changeMode(MONITOR_MODE.LOCK)} />
      </View>



    </>
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