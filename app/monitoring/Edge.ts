import Vertex from "./Vertex";

const DISTANCE_FOR_VERTEX_ADD = 32;
const LIMIT_FOR_VERTEX_ANGLE = 90 * Math.PI / 180; //NO CAMBIAR

export default class Edge {
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

  private angleBetweenThreeVertices(vertexA: Vertex, vertexB: Vertex, vertexC: Vertex){
    const distanceAB = this.getVerticesDistance(vertexA, vertexB);
    const distanceAC = this.getVerticesDistance(vertexA, vertexC);
    const distanceBC = this.getVerticesDistance(vertexB, vertexC);
    return Math.acos((distanceAB**2 + distanceAC**2 - distanceBC**2) / (2 * distanceAB * distanceAC));
  }


  vertexCouldBeAdded(newVertex: Vertex){
    //K and L are illusionary angles that are conveniently aligned to the A vertex vertical.
    const angleBAK = this.getVertexAngleWithVertical(this.vertices.A, this.vertices.B);
    const angleCAL = this.getVertexAngleWithVertical(this.vertices.A, newVertex);

    const AC_Distance = this.getVerticesDistance(this.vertices.A, newVertex);
    
    const newVertexAngle = Math.abs(angleBAK - angleCAL);

    const newVertexPerpendicularDistanceWithEdge = AC_Distance * Math.sin(newVertexAngle);

    if(newVertexPerpendicularDistanceWithEdge < DISTANCE_FOR_VERTEX_ADD){
      return this.angleBetweenThreeVertices(this.vertices.A, this.vertices.B, newVertex) < LIMIT_FOR_VERTEX_ANGLE &&
             this.angleBetweenThreeVertices(this.vertices.B, this.vertices.A, newVertex) < LIMIT_FOR_VERTEX_ANGLE;
    }

    return false;
  }

  
  addVertex(newVertex: Vertex){
    const newEdge = new Edge(newVertex,this.vertices.B);
    this.vertices.B = newVertex;
    return newEdge;
  }

  ifHaveThisVertexGimmeTheOther(vertexToSearch: Vertex|string){
    if(vertexToSearch instanceof String){
      if(vertexToSearch == this.vertices.A.id){
        return this.vertices.B;
      }
      if(vertexToSearch == this.vertices.B.id){
        return this.vertices.A;
      }
    }else if(vertexToSearch instanceof Vertex){
      if(vertexToSearch.equalsTo(this.vertices.A)){
        return this.vertices.B;
      }
      if(vertexToSearch.equalsTo(this.vertices.B)){
        return this.vertices.A;
      }
    }
    return null;
  }
}