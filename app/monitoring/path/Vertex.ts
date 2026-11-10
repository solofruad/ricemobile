import { Point } from "@/types/types";
export default class Vertex{
  id:string;
  x:number;
  y:number;

  constructor(x:number, y:number, id?:string){
    this.id = id ?? `v${window.performance.now().toString()}`;
    this.x = x;
    this.y = y;
  }

  getAsPoint(): Point{
    return { x: this.x, y: this.y };
  }

  equalsTo(testVertex: Vertex){
    return this.id == testVertex.id;
  }
}