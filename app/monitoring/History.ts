import { Point } from "@/types/types"
import { EDIT_PATH } from "./MonCanvas"

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
    console.warn(`element.path      = ${element.path}`);
    console.warn(`element.operation = ${element.operation}`);
    console.warn(`!element.vertexId = ${!element.vertexId}`);
    console.warn(`!element.prevId   = ${!element.prevId}`);
    console.warn(`!element.nextId   = ${!element.nextId}`);
    console.warn(`!element.before   = ${!element.before}`);
    console.warn(`!element.after    = ${!element.after}`);
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
  private removeElement(){

  }
  before(){

  }
}