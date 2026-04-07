import { Point } from "@/types/types";
import { Canvas, Skia, Path as SkPath } from "@shopify/react-native-skia";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import GestureHandler from "./GestureHandler";
import { SharedValue, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { Button } from "react-native-paper";
import Path, { VERTEX_ADD } from "./Path";
import History, { PATH_OP } from "./History";

import { Vibration } from 'react-native';

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

  const generateSharedValue = () =>{
    polygonSharedData.set(polygon.current.generateLinkedList());
    wPathSharedData.set(wPath.current.generateLinkedList())
  }

  const isOnePathInsideAnother = (outerPath: PolygonSharedValue, innerPath: PolygonSharedValue) =>{
    for (const vertex of innerPath) {
      if(!isPointInsidePolygon(outerPath,vertex))
        return false;
    }
    return true;
  }

  const handlePanStart = useCallback((point: Point) => {
    //Search near vertex in the polygon and the path
    let vertex;
    if(vertex = polygon.current.getVertexNearCoord(point)){
      pathToEdit.value = EDIT_PATH.POLYGON;
    }else if(vertex = wPath.current.getVertexNearCoord(point)){
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
        dataJS.current = new Path( sharedData.value.map(v => ({ x: v.x, y: v.y })) );
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
    vertexToEditId.value = null; //? Que hace esto aca?
    let pathToAddVertex = EDIT_PATH.NONE;
    let result: VERTEX_ADD;
    if(( result = polygon.current.addVertex(point) ) == VERTEX_ADD.POINT_TOO_FAR){
      if(isPointInsidePolygon(polygonSharedData.value, point) && (result = wPath.current.addVertex(point)) == VERTEX_ADD.VERTEX_ADDED){
        //Know  where added
        pathToAddVertex = EDIT_PATH.W_PATH;
      }
    } else if(result == VERTEX_ADD.VERTEX_ADDED){
      //Know where added
      pathToAddVertex = EDIT_PATH.POLYGON;
    }

    if(result == VERTEX_ADD.VERTEX_ADDED){
      const dataJS = pathToAddVertex == EDIT_PATH.POLYGON ? polygon: wPath;
      history.current.addElement({  path: pathToAddVertex, 
                operation:PATH_OP.INSERT, 
                vertexId: dataJS.current.lastVertexAdded?.id as string, //From JS Thread
                prevId: dataJS.current.lastEdgesEdited[0].vertices.A.id as string, //From JS Thread
                nextId: dataJS.current.lastEdgesEdited[0].vertices.B.id as string, //From JS Thread
                after: point})
      generateSharedValue();
    }
  }, []);



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
        </Canvas>
      </GestureHandler>
      <Button onPress={()=>{ 
        polygon.current = new Path(rectPoints);
        wPath.current = new Path(wPoints);
        generateSharedValue(); 
        }}>Reset</Button>

      <Button onPress={()=>{console.log(history.current.elements)}}>console table vertexes coords</Button>
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

//TODO: Agregar 