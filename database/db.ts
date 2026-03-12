import * as SQLite from 'expo-sqlite';
import { File, Directory, Paths } from 'expo-file-system';
import { ObjectDetectionResult } from '@/src/ObjectDetection';

export type DetectionRecord = {
  id: number;
  photo_dir: string;
  result_json: any; // El resultado de la detección, almacenado como JSON
  created_at: string; // Fecha de creación del registro
};


export default class Database {
  private static instance: Database;

  private databaseInst: SQLite.SQLiteDatabase | null = null;

  static getInstance(){
    return Database.instance;
  }

  constructor(){
    Database.instance = this;
  }

  private checkIfSQLiteDirExists(): void{
    const sqliteDir = new Directory(Paths.document.uri + "SQLite");
    if (!sqliteDir.exists) {
      sqliteDir.create();
    }
  }

  private getDB(): Promise<SQLite.SQLiteDatabase> {
    return new Promise<SQLite.SQLiteDatabase>((resolve, reject) => {
      if (this.databaseInst) {
        resolve(this.databaseInst);
      } else {
        this.checkIfSQLiteDirExists();
        SQLite.openDatabaseAsync('detections.db', {}, Paths.document.uri + "SQLite")
          .then(database => {
            this.databaseInst = database;
            this.initDB(this.databaseInst)
              .then(_=>{
                resolve(this.databaseInst as SQLite.SQLiteDatabase);
              });
          })
          .catch( error => reject("Error"+error) );
      }
    }) as Promise<SQLite.SQLiteDatabase>;
  }

  private initDB (database: SQLite.SQLiteDatabase) {
    return database.execAsync(`
      CREATE TABLE IF NOT EXISTS detections (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_dir   TEXT,
        result_json TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now','localtime'))
      );
    `);
  }

  insertDetection (photo_dir:string, data:ObjectDetectionResult[]): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.getDB()
      .then(db=>{
        db.runAsync(
          `INSERT INTO detections (photo_dir, result_json) VALUES (?, ?)`,
          [photo_dir, JSON.stringify(data)]
        ).then(result=>{
          return resolve(result.lastInsertRowId);
        });
      });
    });
  }

  getAllDetections(): Promise<Array<DetectionRecord>> {
    return new Promise<Array<DetectionRecord>>((resolve, reject) => {
      this.getDB()
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

  getDetectionById (id:number) {
    return new Promise<DetectionRecord | null>((resolve, reject) => {
      this.getDB()
      .then(db=>{
        db.getFirstAsync<DetectionRecord | null>(`SELECT * FROM detections WHERE id = ?`, [id])
        .then(row => {
          if (!row) {
            resolve(null);
          } else {
            resolve({ ...row, result_json: JSON.parse(row.result_json) });
          }
        });
      });
    }) as Promise<DetectionRecord | null>;
  }

  deleteDetection (id: number) {
    return new Promise<void>((resolve, reject) => {
      this.getDB()
      .then(db=>{
        db.runAsync(`DELETE FROM detections WHERE id = ?`, [id])
        .then(() => {
          resolve();
        });
      })
    });
  };

  clearDetections (id: number) {
    return new Promise<void>((resolve, reject) => {
      this.getDB()
      .then(db=>{
        db.runAsync(`DELETE FROM detections`)
        .then(() => {
          resolve();
        });
      })
    });
  }
}