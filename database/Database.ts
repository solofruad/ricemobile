import * as SQLite from 'expo-sqlite';
import { Directory, Paths } from 'expo-file-system';

export type MonitorDrawingRecord = {
  id: number;
  drawing_json: any; // El dibujo del monitor, almacenado como JSON
  created_at: string; // Fecha de creación del registro
};

export function isObject(value:any) {
  return typeof value === 'object' &&
         value !== null &&
         !Array.isArray(value)
}


export default class Database {
  private static objectInstance: Database;

  private databaseInst: SQLite.SQLiteDatabase | null = null;

  static getInstance(){
    return Database.objectInstance;
  }

  constructor(){
    Database.objectInstance = this;
  }

  private checkIfSQLiteDirExists(): void{
    const sqliteDir = new Directory(Paths.document.uri + "SQLite");
    if (!sqliteDir.exists) {
      sqliteDir.create();
    }
  }

  static getDB(): Promise<SQLite.SQLiteDatabase> {
    return new Promise<SQLite.SQLiteDatabase>((resolve, reject) => {
      const instance = Database.objectInstance;
      if (instance.databaseInst) {
        resolve(instance.databaseInst);
      } else {
        instance.initDatabase()          
          .then( db =>  resolve(db) )
          .catch( error => reject("Error"+error) );
      }
    }) as Promise<SQLite.SQLiteDatabase>;
  }

  private initDatabase () {
    return new Promise<SQLite.SQLiteDatabase>((resolve, reject) => {
    this.checkIfSQLiteDirExists();
    SQLite.openDatabaseAsync('detections.db', {}, Paths.document.uri + "SQLite")
      .then(database => {
        this.databaseInst = database;
        resolve(this.databaseInst as SQLite.SQLiteDatabase);
      })
      .catch( error => reject(error) );
    }) as Promise<SQLite.SQLiteDatabase>;
  }
}