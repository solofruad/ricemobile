import { MonitorDrawingData } from '@/app/monitoring/MonEdit';
import Table from '../Table';

export type MonitorDrawingRecord = {
  id: number;
  polygon: any; // El dibujo del monitor, almacenado como JSON
  samplingPath: any; // El dibujo del monitor, almacenado como JSON
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
    return this.tableInstance.initTable();
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

  static delete (id: number) {
    return this.tableInstance.delete(id);
  };

  static clearAll () {
    return this.tableInstance.clearAll();
  }
}