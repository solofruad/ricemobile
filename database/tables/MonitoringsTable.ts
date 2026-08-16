import Database from '../Database';
import Table from '../Table';

export type MonitoringsRecord = {
  id: number;
  id_monitor_drawing: number; // ID del dibujo del monitor asociado
  processed: boolean; // Indica si el monitoreo ha sido procesado
  created_at: string; // Fecha de creación del registro
};

export type MonitoringsWithDrawingRecord = MonitoringsRecord & {
  polygon: any;
  samplingPath: any;
};

type RawMonitoringWithDrawingRow = Omit<MonitoringsWithDrawingRecord, "polygon" | "samplingPath"> & {
  polygon_json?: string;
  samplingPath_json?: string;
};

export default class MonitoringsTable {
  private static queryingConfig = {
    initTable: `
      CREATE TABLE IF NOT EXISTS monitorings (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        id_monitor_drawing INTEGER NOT NULL,
        processed   BOOLEAN DEFAULT FALSE,
        created_at  TEXT DEFAULT (datetime('now','localtime')),
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

  static insert (data: { id_monitor_drawing: number }): Promise<number> {
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

  static getProcessed (): Promise<MonitoringsRecord[]> {
    return new Promise<Array<MonitoringsRecord>>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.getAllAsync<MonitoringsRecord>(`SELECT * FROM monitorings WHERE processed = 1 ORDER BY created_at DESC`)
            .then(rows => resolve(rows))
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static getProcessedWithDrawing (): Promise<MonitoringsWithDrawingRecord[]> {
    return new Promise<MonitoringsWithDrawingRecord[]>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.getAllAsync<RawMonitoringWithDrawingRow>(`
            SELECT m.*, d.polygon_json, d.samplingPath_json
            FROM monitorings m
            JOIN monitorDrawings d ON d.id = m.id_monitor_drawing
            WHERE m.processed = 1
            ORDER BY m.created_at DESC
          `)
            .then(rows => {
              resolve(rows.map(row => ({
                ...row,
                polygon: row.polygon_json ? JSON.parse(row.polygon_json) : null,
                samplingPath: row.samplingPath_json ? JSON.parse(row.samplingPath_json) : null,
              })));
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static getActiveByDrawingId (id_monitor_drawing: number): Promise<MonitoringsRecord | null> {
    return new Promise<MonitoringsRecord | null>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.getFirstAsync<MonitoringsRecord | null>(`SELECT * FROM monitorings WHERE id_monitor_drawing = ? AND processed = 0 ORDER BY id DESC LIMIT 1`, [id_monitor_drawing])
            .then(row => resolve(row ?? null))
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static markProcessed (id: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.runAsync(`UPDATE monitorings SET processed = 1 WHERE id = ?`, [id])
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