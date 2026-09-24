import Table, { ensureColumn } from '../Table';
import Database from '../Database';

export type FarmFormRecord = {
  id: number;
  nombre_finca: string | null; // nombre de la finca (opcional)
  hectareas: number | null; // extensión aproximada de la finca en hectáreas
  departamento: string | null;
  municipio: string | null;
  vereda: string | null; // nombre de la vereda (texto libre, opcional)
  uploaded: boolean; // indica si la información ya fue enviada al servidor
  remote_id: number | null; // id de la finca en el backend (una vez creada)
  last_requested_at: string | null; // última vez que se pidió rellenar el formulario
  created_at: string;
  uploaded_at: string | null;
};

const SINGLETON_ID = 1;

export default class FarmFormTable {
  private static queryingConfig = {
    initTable: `
      CREATE TABLE IF NOT EXISTS farm_form (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_finca      TEXT,
        hectareas         REAL,
        departamento      TEXT,
        municipio         TEXT,
        vereda            TEXT,
        uploaded          BOOLEAN DEFAULT FALSE,
        last_requested_at TEXT,
        created_at        TEXT DEFAULT (datetime('now','localtime')),
        uploaded_at       TEXT
      );
    `,
    tableName: "farm_form",
    searchField: "id",
    requiredFields: [],
    willUseSelectRecent: true,
  };

  private static tableInstance = new Table<FarmFormRecord>(FarmFormTable.queryingConfig);

  static initTable () {
    return this.tableInstance.initTable()
      .then(() => ensureColumn("farm_form", "remote_id", "INTEGER"));
  }

  static getForm (): Promise<FarmFormRecord | null> {
    return new Promise<FarmFormRecord | null>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.getFirstAsync<FarmFormRecord>(`SELECT * FROM farm_form WHERE id = ? LIMIT 1`, [SINGLETON_ID])
            .then(row => resolve(row ?? null))
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  // Crea la fila singleton si aún no existe (para poder registrar last_requested_at aunque se omita)
  static ensureRow (): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.getForm()
        .then(row => {
          if (row) return resolve();
          Database.getDB()
            .then(db => {
              db.runAsync(`INSERT INTO farm_form (id, uploaded, last_requested_at) VALUES (?, 0, NULL)`, [SINGLETON_ID])
                .then(() => resolve())
                .catch(err => reject(err));
            })
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  // Registra el momento en que se pidió (mostró) el formulario
  static markRequested (): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.ensureRow()
        .then(() => Database.getDB())
        .then(db => {
          db.runAsync(`UPDATE farm_form SET last_requested_at = datetime('now','localtime') WHERE id = ?`, [SINGLETON_ID])
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  // Guarda la información recolectada del formulario
  static saveResponse (data: { nombre_finca: string | null; hectareas: number; departamento: string; municipio: string; vereda: string | null }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.ensureRow()
        .then(() => Database.getDB())
        .then(db => {
          db.runAsync(
            `UPDATE farm_form
             SET nombre_finca = ?, hectareas = ?, departamento = ?, municipio = ?, vereda = ?, uploaded = 0, uploaded_at = NULL
             WHERE id = ?`,
            [data.nombre_finca, data.hectareas, data.departamento, data.municipio, data.vereda, SINGLETON_ID],
          )
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  // Marca la información como enviada exitosamente al servidor
  static markUploaded (): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.runAsync(
            `UPDATE farm_form SET uploaded = 1, uploaded_at = datetime('now','localtime') WHERE id = ?`,
            [SINGLETON_ID],
          )
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  // Guarda el id remoto de la finca creada en el backend (la finca se crea una sola vez)
  static setRemoteId (remoteId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.ensureRow()
        .then(() => Database.getDB())
        .then(db => {
          db.runAsync(`UPDATE farm_form SET remote_id = ? WHERE id = ?`, [remoteId, SINGLETON_ID])
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }
}
