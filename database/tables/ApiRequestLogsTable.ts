import Table from '../Table';
import Database from '../Database';

export type LogSource = 'riceback' | 'llm';

export type ApiLogRecord = {
  id: number;
  source: LogSource;
  method: string;
  url: string;
  request_body: string | null;
  response_body: string | null;
  status_code: number | null;
  error: string | null;
  created_at: string;
};

export default class ApiRequestLogsTable {
  private static queryingConfig = {
    initTable: `
      CREATE TABLE IF NOT EXISTS api_request_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        request_body TEXT,
        response_body TEXT,
        status_code INTEGER,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      );
    `,
    tableName: "api_request_logs",
    searchField: "id",
    requiredFields: ["source", "method", "url", "request_body", "response_body", "status_code", "error"],
    willUseSelectRecent: true,
  };

  private static tableInstance = new Table<ApiLogRecord>(ApiRequestLogsTable.queryingConfig);

  static initTable() {
    return this.tableInstance.initTable();
  }

  static insert(data: {
    source: LogSource;
    method: string;
    url: string;
    request_body?: string | null;
    response_body?: string | null;
    status_code?: number | null;
    error?: string | null;
  }): Promise<number> {
    return this.tableInstance.insert({
      source: data.source,
      method: data.method,
      url: data.url,
      request_body: data.request_body ?? null,
      response_body: data.response_body ?? null,
      status_code: data.status_code ?? null,
      error: data.error ?? null,
    });
  }

  static getAllNewestFirst(): Promise<Array<ApiLogRecord>> {
    return new Promise<Array<ApiLogRecord>>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.getAllAsync<ApiLogRecord>(
            `SELECT * FROM ${ApiRequestLogsTable.queryingConfig.tableName} ORDER BY id DESC`,
          )
            .then(rows => resolve(rows))
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static getBySourceNewestFirst(source: LogSource): Promise<Array<ApiLogRecord>> {
    return new Promise<Array<ApiLogRecord>>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.getAllAsync<ApiLogRecord>(
            `SELECT * FROM ${ApiRequestLogsTable.queryingConfig.tableName} WHERE source = ? ORDER BY id DESC`,
            [source],
          )
            .then(rows => resolve(rows))
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static getAll() {
    return this.getAllNewestFirst();
  }

  static getById(id: number) {
    return this.tableInstance.getById(id);
  }

  static pruneKeepLast(maxEntries: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      Database.getDB()
        .then(db => {
          db.runAsync(
            `DELETE FROM ${ApiRequestLogsTable.queryingConfig.tableName} WHERE id NOT IN (SELECT id FROM ${ApiRequestLogsTable.queryingConfig.tableName} ORDER BY id DESC LIMIT ?)`,
            [maxEntries],
          )
            .then(() => resolve())
            .catch(err => reject(err));
        })
        .catch(err => reject(err));
    });
  }

  static delete(id: number) {
    return this.tableInstance.delete(id);
  }

  static clearAll() {
    return this.tableInstance.clearAll();
  }
}
