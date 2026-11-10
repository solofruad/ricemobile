import { MonitorDrawingData } from '@/app/monitoring/MonEdit';
import Database from '../Database';
import Table, { ensureColumn } from '../Table';

export type MonitorDrawingRecord = {
  id: number;
  polygon: any; // El dibujo del monitor, almacenado como JSON
  samplingPath: any; // El dibujo del monitor, almacenado como JSON
  remote_id?: number | null; // id del trazado en el backend (una vez creado)
  created_at: string; // Fecha de creación del registro
};

export default class MonitorDrawingsTable {
  private static queryingConfig = {
    initTable: `
      CREATE TABLE IF NOT EXISTS monitorDrawings (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        polygon_json TEXT NOT NULL,
        samplingPath_json TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now','localtime'))
      );
    `,
    tableName: "monitorDrawings",
    searchField: "id",
    requiredFields: ["polygon", "samplingPath"],
    willUseSelectRecent: true,
  };

  private static tableInstance = new Table<MonitorDrawingRecord>(MonitorDrawingsTable.queryingConfig);

  static initTable () {
    return this.tableInstance.initTable()
      .then(() => ensureColumn("monitorDrawings", "remote_id", "INTEGER"));
  }

  static insert ( data: MonitorDrawingData): Promise<number> {
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

  static setRemoteId (id: number, remoteId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.runAsync(`UPDATE monitorDrawings SET remote_id = ? WHERE id = ?`, [remoteId, id])
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static delete (id: number) {
    return this.tableInstance.delete(id);
  };

  static clearAll () {
    return this.tableInstance.clearAll();
  }
}