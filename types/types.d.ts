export type Point = {
  x: number,
  y: number
}


export type ObjectDetectionResult = {
  frame:{
    origin:{x:number, y:number},
    size:{x:number, y:number}
  },
  labels: Array<{
    text: string,
    confidence: number
  }>
}