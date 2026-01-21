import { Point } from "@/types/types";
import { Canvas, Group, Line, Rect, vec, Text, matchFont, CanvasRef } from "@shopify/react-native-skia";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, View } from "react-native";
import GestureHandler from "./GestureHandler";

class Vertex{
  id:string;
  x:number;
  y:number;

  constructor(x:number, y:number){
    this.id = `vertex${window.performance.now().toString()}`;
    this.x = x;
    this.y = y;
  }

  getAsVec(){
    return vec(this.x,this.y);
  }

  equalsTo(testVertex: Vertex){
    return this.id == testVertex.id;
  }
}


const DISTANCE_CRITERION_FOR_VERTEX_ADD = 32;

class Edge {
  vertices: {A:Vertex, B:Vertex}

  constructor(vertexA: Vertex, vertexB: Vertex){
    this.vertices = {A: vertexA, B: vertexB};
  }

  private getVertexAngleWithVertical(vertexA: Vertex, vertexB: Vertex){
    const distanceAK = vertexB.y - vertexA.y;
    const distanceBK = vertexB.x - vertexA.x;
    return Math.atan(distanceBK/distanceAK);
  }

  private getVerticesDistance(vertexA: Vertex = this.vertices.A, vertexB: Vertex = this.vertices.B){
    return Math.sqrt( ( (vertexA.x - vertexB.x) **2) + ( (vertexA.y - vertexB.y) **2) );
  }


  vertexCouldBeAdded(newVertex: Vertex){
    //K and L are illusionary angles that are conveniently aligned to the A vertex vertical.
    const angleBAK = this.getVertexAngleWithVertical(this.vertices.A, this.vertices.B);
    const angleCAL = this.getVertexAngleWithVertical(this.vertices.A, newVertex);

    const newVertexAngle = Math.abs(angleBAK - angleCAL);

    const AC_Distance = this.getVerticesDistance(this.vertices.A, newVertex);

    const newVertexPerpendicularDistanceWithEdge = AC_Distance * Math.sin(newVertexAngle);

    console.log(newVertexPerpendicularDistanceWithEdge);

    return newVertexPerpendicularDistanceWithEdge < DISTANCE_CRITERION_FOR_VERTEX_ADD;
  }

  
  addVertex(newVertex: Vertex){
    const newEdge = new Edge(newVertex,this.vertices.B);
    this.vertices.B = newVertex;
    return newEdge;
  }

  ifHaveThisVertexGimmeTheOther(vertexToSearch: Vertex){
    if(vertexToSearch.equalsTo(this.vertices.A)){
      return this.vertices.B;
    }
    if(vertexToSearch.equalsTo(this.vertices.B)){
      return this.vertices.A;
    }
    return null;
  }

  getAsLine(){
    return <Line 
            key={`edge-${this.vertices.A.id}-${this.vertices.B.id}`} 
            p1={this.vertices.A.getAsVec()}
            p2={this.vertices.B.getAsVec()}
            color="white"
            style="stroke"
            strokeWidth={4}
          />
  }
}

class Polygon {
  vertices: Map<string,Vertex> = new Map();
  edges: Array<Edge> = [];

  constructor(){
    this.instanceBasePolygon();
  }

  private instanceBasePolygon(){
    const vxA = new Vertex(100,100);
    const vxB = new Vertex(400,100);
    const vxC = new Vertex(400,400);
    const vxD = new Vertex(100,400);

    this.vertices.set(vxA.id,vxA);
    this.vertices.set(vxB.id,vxB);
    this.vertices.set(vxC.id,vxC);
    this.vertices.set(vxD.id,vxD);
    
    this.edges.push(new Edge(vxA, vxB));
    this.edges.push(new Edge(vxB, vxC));
    this.edges.push(new Edge(vxC, vxD));
    this.edges.push(new Edge(vxD, vxA));
  }

  getVertexNearCoord(point: Point){
    let res = null
    this.vertices.forEach(vertex => {
      const distance = Math.sqrt( ( (vertex.x - point.x) **2) + ( (vertex.y - point.y) **2) );
      if(distance<40){
        res = vertex;
      }
    });
    return res;
  }

  addVertex (point:Point) {
    const newVertex = new Vertex(point.x, point.y);

    //For each edge ask if the vertex could be added between it's two vertices
    //Until it could be a added
    //Or not

    for (const edge of this.edges) {
      if(edge.vertexCouldBeAdded(newVertex)){
        //adding a new vertex between two connected vertex creates a new edge, so..
        this.vertices.set(newVertex.id, newVertex);
        const newEdge = edge.addVertex(newVertex);
        this.edges.push(newEdge);
        return;
      }
    }
  }

  deleteVertex(vertexToDelete: Vertex){
    //find the two edges that shares that vertex
    //then, delete both edges and create a new edge
    //with the not-to-delete vertices that was present in both edges
    let vertex: Vertex | null;
    let vertices: Array<Vertex> = [];

    for (let index = 0; index < this.edges.length; index++) {
      const edge = this.edges[index];
      if(vertex = edge.ifHaveThisVertexGimmeTheOther(vertexToDelete)){
        vertices.push(vertex);
        if(vertices.length == 2){
          const newEdge = new Edge(vertices[0], vertices[1]);
          this.edges.splice(index, 1, newEdge);

          this.vertices.delete(vertexToDelete.id);
          break;
        }
        this.edges.splice(index, 1);
        index--;
      }
    }
  }
}

export default function MonCanvas() {
  const [dims, setDims] = useState<{ x: number; y: number } | null>(null);
  const [vertexToEdit, setVertexToEdit] = useState<Vertex | null>(null);
  const polygon = useRef(new Polygon());

  const canvasRef = useRef(null);
  const [data, setData] = useState(0);
  
  // Track if a render is already scheduled
  const rafRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const screen = Dimensions.get("screen");
    setDims({
      x: screen.width,
      y: screen.height,
    });
  }, []);

  // Schedule a render using requestAnimationFrame
  const scheduleRender = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        setData((prev) => prev + 1);
        rafRef.current = null;
      });
    }
  }, []);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handlePanStart = useCallback((point: Point) => {
    const vertex = polygon.current.getVertexNearCoord(point);
    setVertexToEdit(vertex);
    isDraggingRef.current = true;
  }, []);

  const handlePan = useCallback(
    (point: Point) => {
      if (vertexToEdit && isDraggingRef.current) {
        vertexToEdit.x = point.x;
        vertexToEdit.y = point.y;
        scheduleRender();
      }
    },
    [vertexToEdit, scheduleRender]
  );

  const handlePanEnd = useCallback(() => {
    isDraggingRef.current = false;
    setVertexToEdit(null);
  }, []);

  const handleTap = useCallback((point: Point) => {
    setVertexToEdit(null);
    polygon.current.addVertex(point);
    setData((prev) => prev + 1);
  }, []);

  if (dims) {
    return (
      <GestureHandler
        panStart={handlePanStart}
        pan={handlePan}
        panEnd={handlePanEnd}
        tap={handleTap}
      >
        <Canvas
          ref={canvasRef}
          style={{
            width: dims.x,
            height: dims.y,
            backgroundColor: "black",
            marginTop: "auto",
            marginBottom: "auto",
            position: "relative",
          }}
        >
          {polygon.current.edges.map((edge) => edge.getAsLine())}
        </Canvas>
      </GestureHandler>
    );
  }

  return <View style={{ backgroundColor: "#1c100fff" }} />;
}