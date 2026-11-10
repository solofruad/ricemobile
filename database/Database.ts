import * as SQLite from 'expo-sqlite';
import { Directory, Paths } from 'expo-file-system';
import Utils from '@/utils/utils';
import { DATABASE_NAME, SQLITE_DIR_NAME } from '@/constants/config';


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
    const sqliteDir = new Directory(Paths.document.uri + SQLITE_DIR_NAME);
    if (!sqliteDir.exists) {
      sqliteDir.create();
    }
  }

  static deleteDatabaseDir(){
    const sqliteDir = new Directory(Paths.document.uri + SQLITE_DIR_NAME);
    if (sqliteDir.exists) {
      sqliteDir.delete();
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
    SQLite.openDatabaseAsync(DATABASE_NAME, {}, Paths.document.uri + SQLITE_DIR_NAME)
      .then(database => {
        this.databaseInst = database;
        resolve(this.databaseInst as SQLite.SQLiteDatabase);
      })
      .catch( error => reject(error) );
    }) as Promise<SQLite.SQLiteDatabase>;
  }
}