import { Point } from "@/types/types";
import Edge from "./Edge";
import Vertex from "./Vertex";

export enum VERTEX_OPERATION {
  VERTEX_ADDED,
  ANOTHER_VERTEX_TOO_NEAR,
  POINT_TOO_FAR_OF_PATH, //point to far of the path

  VERTEX_DELETED,
  NO_VERTEX_NEAR_GIVEN_POINT,
  NOT_ENOUGH_VERTEXES,
  NO_AB_VERTEXES_FOUND
}

const DISTANCE_FOR_VERTEX_SELECT = 32;

export default class Path {
  vertices: Map<string,Vertex> = new Map();
  endVertexes: Array<Vertex> = [];//TODO: implement it, atleast for open paths
  edges: Array<Edge> = [];

  lastEdgesEdited:Array<string> = []; //the edges affected by the last adition or deletion of a vertex
  lastVertexAdded:Vertex|null = null; 
  lastVertexDeleted: Vertex|null = null;

  constructor(points: Array<Point|{ x: number; y: number; id: string }> = []){
    this.instanceBasePolygon(points);
  }

  private instanceBasePolygon(points: Array<Point|{ x: number; y: number; id: string }> = []) {
    const vertexes = points.map((v): Vertex => new Vertex(v.x, v.y, ('id' in v ? v.id : undefined)));
    vertexes.forEach(vertex => this.vertices.set(vertex.id, vertex));
    for (let index = 0; index < vertexes.length; index++) {
      const vertexA = vertexes[index];
      const vertexB = vertexes[(index + 1) % vertexes.length];
      this.edges.push(new Edge(vertexA, vertexB));
    }
    console.info("vertexes", vertexes);
    this.endVertexes = [vertexes[0], vertexes.at(-1) as Vertex];
    console.info("end vertexes", this.endVertexes);
  }

  getNearestVertexToGivenPoint(point: Point): Vertex | null {
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
   * @returns VERTEX_OPERATION
   */
  addVertexInPoint (point:Point) {
    this.lastEdgesEdited = [];
    this.lastVertexAdded = null;
    const newVertex = new Vertex(point.x, point.y);
    //for each vertex, check if it's near to the point, if it is, refuse to add the vertex, 
    //because it's probably a mistake of the user trying to select that vertex
    if(this.getNearestVertexToGivenPoint(point)){
      return VERTEX_OPERATION.ANOTHER_VERTEX_TOO_NEAR;
    }
    //For each edge ask if the vertex could be added between it's two vertices
    //Until it could be a added or not
    for (const edge of this.edges) {
      if(edge.vertexCouldBeAdded(newVertex)){
        this.lastEdgesEdited = [edge.vertices.A.id, edge.vertices.B.id];//TODO: CHECK HERE
        this.lastVertexAdded = newVertex;
        //adding a new vertex between two connected vertex creates a new edge, so..
        this.vertices.set(newVertex.id, newVertex);
        const newEdge = edge.addVertex(newVertex);
        this.edges.push(newEdge);

        return VERTEX_OPERATION.VERTEX_ADDED;
      }
    }

    return VERTEX_OPERATION.POINT_TOO_FAR_OF_PATH;
  }

  //adding vertex between other vertexes, giving both  vertexes ids
  //This would be exclusive for undo/redo, because the user would never 
  // know the id of the vertexes, so it would be impossible to use this method in other context
  addVertexBetween(vertex:Vertex, vertexAId: string, vertexBId: string){ //*HISTORY SPECIFIC
    for(const edge of this.edges){
      if(edge.vertices.A.id == vertexAId && (edge.vertices.B.id) == vertexBId){
          this.lastEdgesEdited = [edge.vertices.A.id, edge.vertices.B.id];//TODO: CHECK HERE
          this.lastVertexAdded = vertex;
          //adding a new vertex between two connected vertex creates a new edge, so..
          this.vertices.set(vertex.id, vertex);
          const newEdge = edge.addVertex(vertex);
          this.edges.push(newEdge);

          return VERTEX_OPERATION.VERTEX_ADDED;
      }
    }
    //If we reach this line, then something went really wrong
    console.log(vertex, vertexAId, vertexBId);
    // throw new Error("Error adding vertex: the edge with both vertexes was not found");
    return VERTEX_OPERATION.NO_AB_VERTEXES_FOUND;
  }

  /**
   * find the two edges that shares that vertex
   * then, delete both edges and create a new edge
   * with the not-to-delete vertices that was present in both edges
   * @param vertexToDelete 
   */
  deleteVertex(vertexToDelete: Vertex){
    this.lastVertexDeleted = null;
    if(this.vertices.size == 2){
      return VERTEX_OPERATION.NOT_ENOUGH_VERTEXES;
    }

    let previousVertex: Vertex | null = null;
    let nextVertex: Vertex | null = null;
    let firstEdgeFoundIndex = -1;

    for (let index = 0; index < this.edges.length; index++) {
      const edge = this.edges[index];
      const otherVertex = edge.ifHaveThisVertexGimmeTheOther(vertexToDelete);
      if (!otherVertex) { //This edge dont have the vertex searched
        continue;
      } else if (edge.vertices.A.equalsTo(vertexToDelete)) { //So vertexB is the next vertex
        nextVertex = otherVertex;
      } else {
        previousVertex = otherVertex;
      }

      if(firstEdgeFoundIndex === -1){
        firstEdgeFoundIndex = index;
      } else if (previousVertex && nextVertex) { //We found both edges that shares the vertex, we can stop searching
        this.edges.splice(index, 1); //delete the second edge found
        this.edges.splice(firstEdgeFoundIndex, 1); //delete the first edge found
        break;
      }
    }

    if (!previousVertex || !nextVertex) {
      return VERTEX_OPERATION.NO_VERTEX_NEAR_GIVEN_POINT;
    }

    this.lastVertexDeleted = vertexToDelete;
    this.vertices.delete(vertexToDelete.id);

    this.addEdgeWithGivenVertexes(previousVertex, nextVertex);

    return VERTEX_OPERATION.VERTEX_DELETED;
  }
  //todo:CHECK

  //TODO: CHECK
  deleteVertexBetween(vertexAId: string, vertexBId: string){ //*HISTORY SPECIFIC 
    let vertexA: Vertex | null = null;
    let vertexB: Vertex | null = null;
    let vertexToDelete: Vertex | null = null;
    
    for (let index = 0; index < this.edges.length; index++) {
      const edge = this.edges[index];
      if(edge.vertices.A.id == vertexAId){
        vertexA = edge.vertices.A;
        vertexToDelete = edge.vertices.B;
        this.edges.splice(index, 1);
        index--;
      }else if(edge.vertices.B.id == vertexBId){
        vertexB = edge.vertices.B;
        this.edges.splice(index, 1);
        index--;
      }

      if (vertexA && vertexB) { //We found both edges that shares the vertex, we can stop searching
        this.vertices.delete(vertexToDelete!.id);
        this.addEdgeWithGivenVertexes(vertexA, vertexB);
        
        console.log(vertexA ?? vertexAId, vertexB ?? vertexBId, vertexToDelete);
        return VERTEX_OPERATION.VERTEX_DELETED;
      }
    }
    //If we reach this line, then something went really wrong
    console.log(vertexA ?? vertexAId, vertexB ?? vertexBId, vertexToDelete);
    // throw new Error("Error deleting vertex: the edge with both vertexes was not found");
    return VERTEX_OPERATION.NO_AB_VERTEXES_FOUND;
  }

  moveVertex(vertexToMove:string, newX: number, newY: number){ //*HISTORY SPECIFIC
    const vertex = this.vertices.get(vertexToMove);
    if(vertex){
      vertex.x = newX;
      vertex.y = newY;
    }
  }



  private addEdgeWithGivenVertexes(vertexA: Vertex, vertexB: Vertex){
    this.lastEdgesEdited = [vertexA.id, vertexB.id];//TODO: CHECK HERE
    const newEdge = new Edge(vertexA, vertexB);
    this.edges.push(newEdge);
  }

  /**
   * build linked list of vertices, where each vertex has a reference to the next one 
   * in the edges list, then build the shared value array with that list
   */
  generateLinkedList(){
    const linkedList: Array<Vertex> = [];
    let currentVertex = this.endVertexes[0];
    console.log(this.endVertexes)
    //until we get to the first vertex again, if it's a closed path, otherwise we will break when no next vertex is found
    //The problem is when the path is open and the edges are not in order
    do {
      linkedList.push(currentVertex);
      const nextVertex = this.edges.find(edge => edge.vertices.A.equalsTo(currentVertex))?.vertices.B;
      if(!nextVertex){
        break;
      }
      currentVertex = nextVertex;
    } while (!currentVertex.equalsTo(this.endVertexes[0]));

    const sharedValueData = linkedList.map(vertex => ({
      x: vertex.x,
      y: vertex.y,
      id: vertex.id
    }));
    return sharedValueData;
  }

  clone(): Path {
    // Creamos una nueva instancia
    const newPath = new Path();
    
    // Limpiamos lo que el constructor pudo haber creado por defecto
    newPath.vertices = new Map();
    newPath.edges = [];

    // Clonamos los vértices (preservando los mismos IDs y coordenadas)
    this.vertices.forEach((v, id) => {
      newPath.vertices.set(v.id, new Vertex(v.x, v.y, v.id));
    });

    // Reconstruimos los Edges usando las nuevas referencias de vértices
    this.edges.forEach(edge => {
      const vA = newPath.vertices.get(edge.vertices.A.id)!;
      const vB = newPath.vertices.get(edge.vertices.B.id)!;
      newPath.edges.push(new Edge(vA, vB));
    });

    return newPath;
  }

  printVertexConections(){ //INTENDED
    console.warn("-------");
    this.edges.forEach(edge => {
      console.log(`vertex ${edge.vertices.A.id} --------> ${edge.vertices.B.id}`);
    });
    console.warn("-------");
  }
}