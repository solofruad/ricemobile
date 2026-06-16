export default abstract class TableOperations<TableRecord> {
  abstract initTable (): Promise<void>;

  abstract insert (dataInput:Array<any>): Promise<number>;

  abstract getAll(): Promise<Array<TableRecord>>;

  abstract getById (id:number) : Promise<TableRecord | null>;

  abstract delete (id: number) : Promise<void>

  abstract clearAll (id: number) : Promise<void>;
}