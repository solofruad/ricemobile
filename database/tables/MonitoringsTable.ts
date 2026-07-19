import Table from '../Table';

export type MonitoringsRecord = {
  id: number;
  id_monitor_drawing: number; // ID del dibujo del monitor asociado
  processed: boolean; // Indica si el monitoreo ha sido procesado
  created_at: string; // Fecha de creación del registro
};

export default class MonitoringsTable {
  private static queryingConfig = {
    initTable: `
      CREATE TABLE IF NOT EXISTS monitorings (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        id_monitor_drawing INTEGER NOT NULL,
        processed   BOOLEAN DEFAULT FALSE,
        created_at  TEXT DEFAULT (datetime('now','localtime'))
        FOREIGN KEY (id_monitor_drawing) REFERENCES monitorDrawings(id) ON DELETE CASCADE
      );
    `,
    tableName: "monitorings",
    searchField: "id",
    requiredFields: ["id_monitor_drawing"],
    willUseSelectRecent: true,
  };

  private static tableInstance = new Table<MonitoringsRecord>(MonitoringsTable.queryingConfig);

  static initTable () {
    return this.tableInstance.initTable();
  }

  static insert (data: [number]): Promise<number> {
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