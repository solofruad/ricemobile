import Database from '../Database';
import Table from '../Table';

export type ToursRecord = {
  tour_id: string;
  seen_at: string;
};

export default class ToursTable {
  private static queryingConfig = {
    initTable: `
      CREATE TABLE IF NOT EXISTS tours_seen (
        tour_id   TEXT PRIMARY KEY,
        seen_at   TEXT DEFAULT (datetime('now','localtime'))
      );
    `,
    tableName: "tours_seen",
    searchField: "tour_id",
    requiredFields: ["tour_id"],
  };

  private static tableInstance = new Table<ToursRecord>(ToursTable.queryingConfig);

  static initTable () {
    return this.tableInstance.initTable();
  }

  static async isSeen (tourId: string): Promise<boolean> {
    const record = await this.tableInstance.getById(tourId as unknown as number);
    return record !== null;
  }

  static async markSeen (tourId: string) {
    // INSERT OR IGNORE: idempotente, evita UNIQUE constraint si el tour ya se marcó
    const db = await Database.getDB();
    await db.runAsync(
      `INSERT OR IGNORE INTO ${this.queryingConfig.tableName} (tour_id) VALUES (?)`,
      [tourId],
    );
  }

  static clearAll () {
    return this.tableInstance.clearAll();
  }
}
