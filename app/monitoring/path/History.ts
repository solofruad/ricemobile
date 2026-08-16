import { Point } from "@/types/types"
import Path from "./Path";
import Vertex from "./Vertex";
import { EDIT_PATH } from "../MonEdit";

export enum PATH_OP {
  INSERT,
  MOVE,
  DELETE
}
interface HistoryElement {
  path: EDIT_PATH,
  operation: PATH_OP,
  vertexId: string,
  prevId?: string,
  nextId?: string,
  before?: Point,
  after?: Point
}

export default class History{
  elements: Array<HistoryElement> = [];

  addElement(element: HistoryElement){
    if(element.operation == PATH_OP.INSERT){
      if(!element.after){
        //!throw err
      }
    }else if(element.operation == PATH_OP.MOVE){
      if(!element.before || !element.after){
        //!throw err
      }
    }else if(element.operation == PATH_OP.DELETE){
      if(!element.before){
        //!throw err
      }
    }

    this.elements.push(element);
  }

  undo(paths: Map<EDIT_PATH, Path>): [EDIT_PATH, Path] | null {
    const element = this.elements.pop();
    if(!element){
      return null;
    }
    const path = paths.get(element.path);
    // console.log(path?.printVertexConections())
    if(!path){
      //!throw err
      return null;
    }
    if(element.operation == PATH_OP.INSERT){
      if(!element.after){
        //!throw err
        return null;
      }
      console.log(element.vertexId);
      console.log(element.prevId, element.nextId);
      console.log(path.deleteVertexBetween(element.prevId!, element.nextId!));
    }else if(element.operation == PATH_OP.MOVE){
      if(!element.before || !element.after){
        //!throw err
        return null;
      }
      console.log("moving vertex with id "+element.vertexId+" to before coords");
      console.log(path.vertices);
      console.log(path.vertices.get(element.vertexId)?.getAsPoint());
      path.moveVertex(element.vertexId, element.before.x, element.before.y);
      console.log(path.vertices.get(element.vertexId)?.getAsPoint());
    }else if(element.operation == PATH_OP.DELETE){
      if(!element.before){
        //!throw err
        return null;
      }
      console.log("adding vertex with id "+element.vertexId+" to before coords");
      console.log(element.prevId, element.nextId);
      path.addVertexBetween(new Vertex(element.before.x, element.before.y, element.vertexId), element.prevId!, element.nextId!) ;
    }
    return [element.path, path];
  }
}