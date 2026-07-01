import { ObjectDetectionResult } from '@/src/ObjectDetection';
import Database, { isObject } from './Database';

export type DetectionRecord = {
  id: number;
  photo_dir: string;
  result_json: any; // El resultado de la detección, almacenado como JSON
  created_at: string; // Fecha de creación del registro
};

export default class DetectionsTable {
  static initTable () {
    return Database.getDB().then(db => db.execAsync(`
      CREATE TABLE IF NOT EXISTS detections (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_dir   TEXT,
        result_json TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now','localtime'))
      );
    `));
  }

  static insert (data: [string,Array<ObjectDetectionResult>]): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      Database.getDB()
      .then(db=>{
        db.runAsync(
          `INSERT INTO detections (photo_dir, result_json) VALUES (?, ?)`,
          //@ts-ignore
          [data[0],JSON.stringify(data[1])]
        ).then(result=>{
          return resolve(result.lastInsertRowId);
        });
      });
    });
  }

  static getAll(): Promise<Array<DetectionRecord>> {
    return new Promise<Array<DetectionRecord>>((resolve, reject) => {
      Database.getDB()
      .then( db =>{
        db.getAllAsync<DetectionRecord>(`SELECT * FROM detections`)
        .then( rows =>{
          // Parsear el JSON de cada registro
          resolve( rows.map(row => ({
            ...row,
            result_json: JSON.parse(row.result_json),
          })));
        })
        .catch(err=>{
          reject(err);
        });
      });
    });
  }

  static getById (id:number) {
    return new Promise<DetectionRecord | null>((resolve, reject) => {
      Database.getDB()
      .then(db=>{
        db.getFirstAsync<DetectionRecord | null>(`SELECT * FROM detections WHERE id = ?`, [id])
        .then(row => {
          // console.log(row);
          if (!row) {
            resolve(null);
          } else {
            resolve({ ...row, result_json: JSON.parse(row.result_json) });
          }
        });
      });
    }) as Promise<DetectionRecord | null>;
  }

  static delete (id: number) {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
      .then(db=>{
        db.runAsync(`DELETE FROM detections WHERE id = ?`, [id])
        .then(() => {
          resolve();
        });
      })
    });
  };

  static clearAll () {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
      .then(db=>{
        db.runAsync(`DELETE FROM detections`)
        .then(() => {
          resolve();
        });
      })
    });
  }
}