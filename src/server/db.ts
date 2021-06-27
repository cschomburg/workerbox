import { DB } from "../deps.ts";
import { Script } from "./model.ts";

export class Database {
  #db: DB;

  constructor(path: string) {
    this.#db = new DB(path);
    this.init();
  }

  init(): void {
    this.#db.query(`
        CREATE TABLE IF NOT EXISTS scripts (
            id INTEGER PRIMARY KEY,
            name TEXT,
            uuid TEXT,
            status TEXT,
            content BLOB
        );
        CREATE INDEX ON scripts (name);
        CREATE UNIQUE INDEX ON scripts (uuid);

        CREATE TABLE IF NOT EXISTS secrets (
            id INTEGER PRIMARY KEY,
            scriptName TEXT,
            name TEXT,
            value TEXT
        );
        CREATE INDEX ON secrets (scriptName);

        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY,
            name TEXT,
            scriptUuid TEXT,
            target TEXT
        );
        CREATE INDEX ON routes (name);
        CREATE INDEX ON routes (scriptUuid);
    `);
  }

  putScript(script: Script): void {
    this.#db.query(
      `INSERT INTO scripts (name, uuid, status, content) VALUES (?, ?, ?, ?)`,
      [script.name, script.id, script.status, script.content],
    );
  }

  updateScriptStatus(script: Script): void {
    this.#db.query(
      `UPDATE scripts SET status = ? WHERE uuid = ?`,
      [script.status, script.id],
    );
  }

  getScripts(): Script[] {
    const rows = this.#db.query(
      `SELECT name, uuid, status, content FROM scripts`,
    );

    const scripts = [];
    for (const [name, id, status, content] of rows) {
      const script = new Script(name);
      Object.assign(script, { id, status, content });
      scripts.push(script);
    }
    return scripts;
  }
}
