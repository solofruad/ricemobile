export type Point = {
  x: number,
  y: number
}

export type Dictionary<T = any, K extends readonly string[] = string[]> = {
  //K will probable be unused
  [key in K[number]]:T
}

