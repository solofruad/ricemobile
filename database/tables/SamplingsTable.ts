import { SamplingData } from '@/app/monitoring/Sampling';
import Table from '../Table';
import { ObjectDetectionResult } from '@/src/ObjectDetection';


export type SamplingRecord = {
  id_monitoring: number;
  index_sampling_point: number;
  index_photo_in_sampling_point: number;
  photo_dir: string; // Directorio de la foto
  detection: Array<ObjectDetectionResult>; // El resultado de la detección, almacenado como JSON => "detection_json" dentro de la base de datos
  created_at: string; // Fecha de creación del registro
};

export default class SamplingsTable {
  private static queryingConfig = {
    initTable: `
      CREATE TABLE IF NOT EXISTS samplings (
        id_monitoring          INTEGER,
        index_sampling_point INTEGER NOT NULL,
        index_photo_in_sampling_point INTEGER NOT NULL,
        photo_dir TEXT NOT NULL,
        detection_json TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now','localtime')),

        PRIMARY KEY (id_monitoring, index_sampling_point, index_photo_in_sampling_point)
      );
    `,
    tableName: "samplings",
    searchField: "id",
    requiredFields: ["id_monitoring", "index_sampling_point", "index_photo_in_sampling_point", "photo_dir", "detection"],
    willUseSelectRecent: true,
  };

  private static tableInstance = new Table<SamplingRecord>(SamplingsTable.queryingConfig);

  static initTable () {
    return this.tableInstance.initTable();
  }

  static insert ( data: SamplingData): Promise<number> {
    return this.tableInstance.insert(data);
  }

  static getAll(){
    return this.tableInstance.getAll();
  }

  static getById (id:number) {
    return this.tableInstance.getById(id);
  }

  static getRecent () {
    return this.tableInstance.getRecent();
  }

  static delete (id: number) {
    return this.tableInstance.delete(id);
  };

  static clearAll () {
    return this.tableInstance.clearAll();
  }
}