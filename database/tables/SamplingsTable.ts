import { SamplingData } from '@/app/monitoring/samplingUtils';
import Table, { ensureColumn } from '../Table';
import Database from '../Database';
import { ObjectDetectionResult } from '@/src/ObjectDetection';


export type SamplingRecord = {
  id_monitoring: number;
  index_sampling_point: number;
  index_photo_in_sampling_point: number;
  photo_dir: string; // Directorio de la foto
  detection: Array<ObjectDetectionResult>; // El resultado de la detección, almacenado como JSON => "detection_json" dentro de la base de datos
  remote_id?: number | null; // id de la muestra en el backend
  uploaded?: boolean; // indica si la muestra ya fue subida al backend
  created_at: string; // Fecha de creación del registro
};

// Llave primaria compuesta de la tabla samplings
export type SamplingKey = {
  id_monitoring: number;
  index_sampling_point: number;
  index_photo_in_sampling_point: number;
  remote_id?: number | null;
};

type RawSamplingRow = Omit<SamplingRecord, "detection"> & {
  detection_json?: string;
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
    return this.tableInstance.initTable()
      .then(() => ensureColumn("samplings", "remote_id", "INTEGER"))
      .then(() => ensureColumn("samplings", "uploaded", "BOOLEAN DEFAULT 0"));
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

  static getByMonitoringId (id_monitoring: number) {
    return this.tableInstance.getBy("id_monitoring", id_monitoring);
  }

  static deleteByMonitoringId (id_monitoring: number) {
    return this.tableInstance.deleteBy("id_monitoring", id_monitoring);
  }

  static getByMonitoringIdPendingUpload (id_monitoring: number) {
    return new Promise<SamplingRecord[]>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.getAllAsync<RawSamplingRow>(`SELECT * FROM samplings WHERE id_monitoring = ? AND (uploaded = 0 OR uploaded IS NULL) ORDER BY index_sampling_point ASC, index_photo_in_sampling_point ASC`, [id_monitoring])
            .then(rows => {
              resolve(rows.map(row => ({
                ...row,
                detection: row.detection_json ? JSON.parse(row.detection_json) : [],
              })));
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static markUploaded (record: SamplingKey & { remote_id: number }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.runAsync(
            `UPDATE samplings SET uploaded = 1, remote_id = ? WHERE id_monitoring = ? AND index_sampling_point = ? AND index_photo_in_sampling_point = ?`,
            [record.remote_id, record.id_monitoring, record.index_sampling_point, record.index_photo_in_sampling_point],
          )
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static delete (record: SamplingKey) {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.runAsync(
            `DELETE FROM samplings WHERE id_monitoring = ? AND index_sampling_point = ? AND index_photo_in_sampling_point = ?`,
            [record.id_monitoring, record.index_sampling_point, record.index_photo_in_sampling_point],
          )
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static clearAll () {
    return this.tableInstance.clearAll();
  }
}