import { Dictionary } from '@/types/types';
import Utils from '@/utils/utils';
import Database, { isObject } from './Database';

export type Queries = {
  initTable: string;
  insert: string;
  selectAll: string;
  selectById: string;
  selectRecent: string;
  delete: string;
  clearAll: string;
};

export type QueryingConfig = {
    //nombre de la tabla
    //nombre de campo para buscar registros (llave primaria)
    //listado campos requeridos para insertar un registro
    //usar sorting?

    initTable: string;
    tableName: string;
    searchField: string;
    requiredFields: string[];
    willUseSelectRecent?: boolean;
  };


  const preprocessInputData = (data: any): any => {
    const keys = Object.keys(data);

    for (const key of keys) {
      const item = data[key];

      if (isObject(item) || Array.isArray(item)) {
        data[key+"_json"] = JSON.stringify(item);
        delete data[key];
      }
    }
    return data;
  }

  const preprocessOutputData = (data: any): any => {
    const keys = Object.keys(data);
    for (const key of keys) {
      const value = data[key];
      if (typeof value === 'string' && Utils.isStringJSON(value)) {
        data[key.replace('_json', '')] = JSON.parse(value);
      }
    }
    return data;
  }


const generateQueries = (config: QueryingConfig) => {
  return {
    initTable: config.initTable,
    insert: `INSERT INTO ${config.tableName} (${config.requiredFields.join(", ")}) VALUES (${config.requiredFields.map(_ => "?").join(", ")})`,
    selectAll: `SELECT * FROM ${config.tableName}`,
    selectById: `SELECT * FROM ${config.tableName} WHERE ${config.searchField} = ?`,
    selectRecent: config.willUseSelectRecent ? `SELECT * FROM ${config.tableName} ORDER BY ${config.searchField} DESC LIMIT 1` : null,
    delete: `DELETE FROM ${config.tableName} WHERE ${config.searchField} = ?`,
    clearAll: `DELETE FROM ${config.tableName}`,
  } as Queries;
}

export default class Table<T> {
  private queryingConfig;
  private queries;

  constructor(queryingConfig: QueryingConfig) {
    this.queryingConfig = queryingConfig;
    this.queries = generateQueries(queryingConfig);
  }

  initTable () {
    return Database.getDB().then(db => db.execAsync(this.queries.initTable));
  }

  insertDataHavesRequiredFields(data: Dictionary){
    const dataFields = Object.keys(data as Dictionary);
    const requiredFields = this.queryingConfig.requiredFields;
    return dataFields.every(key=>requiredFields.includes(key)) &&
          requiredFields.every(key=>dataFields.includes(key));
  }

  private buildInsertQuery(data: any) {
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.queryingConfig.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const values = fields.map(field => data[field]);
    return { sql, values };
  }

  insert (data: any): Promise<number> {
    if(!isObject(data)){
      throw new Error("Data to insert in the database must to be a dictionary");
    }
    if(!this.insertDataHavesRequiredFields(data)){
      throw new Error(`Data to insert in the database must to have all required fields: ${this.queryingConfig.requiredFields.join(", ")}. But got ${Object.keys(data)}`);
    }

    return new Promise<number>((resolve, reject) => {
      data = preprocessInputData(data);
      const { sql, values } = this.buildInsertQuery(data);

      Database.getDB()
      .then(db=>{
        db.runAsync(sql, values)
        .then(result=>{
          resolve(result.lastInsertRowId);
        })
        .catch(err => reject(err));
      })
      .catch(err => reject(err));
    });
  }

  getAll(): Promise<Array<T>> {
    return new Promise<Array<T>>((resolve, reject) => {
      Database.getDB()
      .then( db =>{
        db.getAllAsync<T>(this.queries.selectAll)
        .then( rows =>{
          resolve( rows.map(row => (preprocessOutputData(row) as T)) );
        })
        .catch(err=>{
          reject(err);
        });
      });
    });
  }

  getById (id:number) {
    return new Promise<T | null>((resolve, reject) => {
      Database.getDB()
      .then(db=>{
        db.getFirstAsync<T | null>(this.queries.selectById, preprocessInputData(id))
        .then(row => {
          if (!row) {
            resolve(null);
          } else {
            resolve(preprocessOutputData(row) as T);
          }
        });
      });
    }) as Promise<T | null>;
  }

  getRecent () {
    return new Promise<T | null>((resolve,reject) => {
      Database.getDB()
      .then( db => {
        db.getFirstAsync<T | null>(this.queries.selectRecent)
        .then(row => {
          if (!row) {
            resolve(null);
          } else {
            resolve(preprocessOutputData(row) as T);
          }
        });
      })
    }) as Promise<T | null>;
  }

  delete (id: number) {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
      .then(db=>{
        db.runAsync(this.queries.delete, preprocessInputData(id))
        .then(() => {
          resolve();
        });
      })
    });
  };

  clearAll () {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
      .then(db=>{
        db.runAsync(this.queries.clearAll)
        .then(() => {
          resolve();
        });
      })
    });
  }
}