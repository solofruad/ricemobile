import { Point } from "@/types/types";
import Edge from "./Edge";
import Vertex from "./Vertex";

export enum VERTEX_ADD {
  VERTEX_ADDED,
  ANOTHER_VERTEX_TOO_NEAR,
  POINT_TOO_FAR
}

const DISTANCE_FOR_VERTEX_SELECT = 32;

export default class Path {
  vertices: Map<string,Vertex> = new Map();
  edges: Array<Edge> = [];

  lastEdgesEdited:Array<Edge> = []; //the edges affected by the last adition or deletion of a vertex
  lastVertexAdded:Vertex|null = null; 

  constructor(points: Array<Point> = []){
    this.instanceBasePolygon(points);
  }

  private instanceBasePolygon(points: Array<Point> = []) {
    const vertexes = points.map((v): Vertex => new Vertex(v.x, v.y));
    vertexes.forEach(vertex => this.vertices.set(vertex.id, vertex));
    for (let index = 0; index < vertexes.length; index++) {
      const vertexA = vertexes[index];
      const vertexB = vertexes[(index + 1) % vertexes.length];
      this.edges.push(new Edge(vertexA, vertexB));
    }
  }

  getVertexNearCoord(point: Point): Vertex | null {
    let res = null;
    for (const vertex of this.vertices.values()) {
      const distance = Math.sqrt( ( (vertex.x - point.x) **2) + ( (vertex.y - point.y) **2) );
      if(distance < DISTANCE_FOR_VERTEX_SELECT){
        res = vertex;
        break;
      }
    };
    return res;
  }

  /**
   * Try to add a vertex in the path
   * @param point 
   * @returns VERTEX_ADD
   */
  addVertex (point:Point) {
    this.lastEdgesEdited = [];
    this.lastVertexAdded = null;
    const newVertex = new Vertex(point.x, point.y);
    //for each vertex, check if it's near to the point, if it is, refuse to add the vertex, 
    //because it's probably a mistake of the user trying to select that vertex
    for (const vertex of this.vertices.values()) {
      const distance = Math.sqrt( ( (vertex.x - point.x) **2) + ( (vertex.y - point.y) **2) );
      if(distance < DISTANCE_FOR_VERTEX_SELECT){
        return VERTEX_ADD.ANOTHER_VERTEX_TOO_NEAR;
      }
    }
    //For each edge ask if the vertex could be added between it's two vertices
    //Until it could be a added
    //Or not
    for (const edge of this.edges) {
      if(edge.vertexCouldBeAdded(newVertex)){
        this.lastEdgesEdited = [edge];//TODO: CHECK HERE
        this.lastVertexAdded = newVertex;
        //adding a new vertex between two connected vertex creates a new edge, so..
        this.vertices.set(newVertex.id, newVertex);
        const newEdge = edge.addVertex(newVertex);
        this.edges.push(newEdge);

        return VERTEX_ADD.VERTEX_ADDED;
      }
    }

    return VERTEX_ADD.POINT_TOO_FAR;
  }

  /**
   * find the two edges that shares that vertex
   * then, delete both edges and create a new edge
   * with the not-to-delete vertices that was present in both edges
   * @param vertexToDelete 
   */
  deleteVertex(vertexToDelete: Vertex){
    let vertex: Vertex | null;
    let vertices: Array<Vertex> = [];

    for (let index = 0; index < this.edges.length; index++) {
      const edge = this.edges[index];
      if(vertex = edge.ifHaveThisVertexGimmeTheOther(vertexToDelete)){
        vertices.push(vertex);
        if(vertices.length == 2){
          const newEdge = new Edge(vertices[0], vertices[1]);
          this.lastEdgesEdited = [newEdge];
          this.edges.splice(index, 1, newEdge);

          this.vertices.delete(vertexToDelete.id);
          break;
        }
        this.edges.splice(index, 1);
        index--;
      }
    }
  }
  /**
   * build linked list of vertices, where each vertex has a reference to the next one 
   * in the edges list, then build the shared value array with that list
   */
  generateLinkedList(){
    const linkedList: Array<Vertex> = [];
    let currentVertex = this.edges[0].vertices.A;
    do {
      linkedList.push(currentVertex);
      const nextVertex = this.edges.find(edge => edge.vertices.A.equalsTo(currentVertex))?.vertices.B;
      if(!nextVertex){
        break;
      }
      currentVertex = nextVertex;
    } while (!currentVertex.equalsTo(this.edges[0].vertices.A));

    const sharedValueData = linkedList.map(vertex => ({
      x: vertex.x,
      y: vertex.y,
      id: vertex.id
    }));
    return sharedValueData;
  }


  buildInsertInfoAboutLastVectorInserted(){

  }
}