import { ObjectDetectionResult } from '@/src/ObjectDetection';
import Table from '../Table';

export type DetectionRecord = {
  id: number;
  photo_dir: string;
  detection: any; // El resultado de la detección, almacenado como JSON => "detection_json" dentro de la base de datos
  created_at: string; // Fecha de creación del registro
};

export default class DetectionsTable {
  private static queryingConfig = {
    //nombre de la tabla
    //nombre de campo para buscar registros (llave primaria)
    //listado campos requeridos para insertar un registro
    //usar sorting?

    initTable: `
      CREATE TABLE IF NOT EXISTS detections (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_dir   TEXT NOT NULL,
        detection_json TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now','localtime'))
      );
    `,
    tableName: "detections",
    searchField: "id",
    requiredFields: ["photo_dir", "detection"],
    willUseSelectRecent: true,
  };

  private static tableInstance = new Table<DetectionRecord>(DetectionsTable.queryingConfig);

  static initTable () {
    return this.tableInstance.initTable();
  }

  static insert (data: {photo_dir:string, detection: Array<ObjectDetectionResult>}): Promise<number> {
    return this.tableInstance.insert(data);
  }

  static getAll(){
    return this.tableInstance.getAll();
  }

  static getById (id:number) {
    return this.tableInstance.getById(id);
  }

  static delete (id: number) {
    return this.tableInstance.delete(id);
  };

  static clearAll () {
    return this.tableInstance.clearAll();
  }
}