import { MonitorDrawingData } from '@/app/monitoring/MonEdit';
import Database from './Database';

export type MonitorDrawingRecord = {
  id: number;
  drawing_json: any; // El dibujo del monitor, almacenado como JSON
  created_at: string; // Fecha de creación del registro
};

export default class MonitorDrawingsTable {
  static initTable () {
    return Database.getDB().then(db => db.execAsync(`
      CREATE TABLE IF NOT EXISTS monitorDrawings (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        drawing_json TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now','localtime'))
      );
    `));
  }

  static insert ( data: MonitorDrawingData): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      Database.getDB()
      .then(db=>{
        db.runAsync(
          `INSERT INTO monitorDrawings (drawing_json) VALUES (?)`,
          [ JSON.stringify(data) ]
        ).then(result=>{
          return resolve(result.lastInsertRowId);
        });
      });
    });
  }

  static getAll(): Promise<Array<MonitorDrawingRecord>> {
    return new Promise<Array<MonitorDrawingRecord>>((resolve, reject) => {
      Database.getDB()
      .then( db =>{
        db.getAllAsync<MonitorDrawingRecord>(`SELECT * FROM monitorDrawings`)
        .then( rows =>{
          // Parsear el JSON de cada registro
          resolve( rows.map(row => ({
            ...row,
            drawing_json: JSON.parse(row.drawing_json),
          })));
        })
        .catch(err=>{
          reject(err);
        });
      });
    });
  }

  static getById (id:number) {
    return new Promise<MonitorDrawingRecord | null>((resolve, reject) => {
      Database.getDB()
      .then( db => {
        db.getFirstAsync<MonitorDrawingRecord | null>(`SELECT * FROM monitorDrawings WHERE id = ?`, [id])
        .then(row => {
          if (!row) {
            resolve(null);
          } else {
            resolve({ ...row, drawing_json: JSON.parse(row.drawing_json) });
          }
        });
      });
    }) as Promise<MonitorDrawingRecord | null>;
  }

  static getRecent () {
    return new Promise<MonitorDrawingRecord | null>((resolve,reject) => {
      Database.getDB()
      .then( db => {
        db.getFirstAsync<MonitorDrawingRecord | null>(`SELECT * FROM monitorDrawings ORDER BY id DESC LIMIT 1`)
        .then(row => {
          if (!row) {
            resolve(null);
          } else {
            resolve({ ...row, drawing_json: JSON.parse(row.drawing_json) });
          }
        });
      })
    }) as Promise<MonitorDrawingRecord | null>;
  }

  static delete (id: number) {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
      .then(db=>{
        db.runAsync(`DELETE FROM monitorDrawings WHERE id = ?`, [id])
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
        db.runAsync(`DELETE FROM monitorDrawings`)
        .then(() => {
          resolve();
        });
      })
    });
  }
}