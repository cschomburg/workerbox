import { DB } from "../deps.ts";
import { KeyValue, Script, Secret } from "./model.ts";

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
            updatedAt TEXT,
            content BLOB
        )
    `);
    this.#db.query(`CREATE INDEX IF NOT EXISTS scripts_name ON scripts (name)`);
    this.#db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS scripts_uuid ON scripts (uuid)`,
    );

    this.#db.query(`
        CREATE TABLE IF NOT EXISTS secrets (
            id INTEGER PRIMARY KEY,
            script TEXT,
            name TEXT,
            value TEXT
        )`);
    this.#db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS secrets_name ON secrets (script, name)`,
    );

    this.#db.query(`
        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY,
            name TEXT,
            scriptUuid TEXT,
            target TEXT
        )
    `);
    this.#db.query(`CREATE INDEX IF NOT EXISTS routes_name ON routes (name)`);
    this.#db.query(
      `CREATE INDEX IF NOT EXISTS routes_uuid ON routes (scriptUuid)`,
    );

    this.#db.query(`
        CREATE TABLE IF NOT EXISTS kv (
            id INTEGER PRIMARY KEY,
            namespace TEXT,
            name TEXT,
            value BLOB
        )
    `);
    this.#db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS kv_name ON kv (namespace, name)`,
    );
  }

  putScript(script: Script): void {
    this.#db.query(
      `INSERT INTO scripts (name, uuid, status, content, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      [
        script.name,
        script.id,
        script.status,
        script.content,
        script.updatedAt.toISOString(),
      ],
    );
  }

  updateScriptStatus(script: Script): void {
    this.#db.query(
      `UPDATE scripts SET status = ?, updatedAt = ? WHERE uuid = ?`,
      [script.status, script.updatedAt.toISOString(), script.id],
    );
  }

  getScripts(): Script[] {
    const rows = this.#db.query(
      `SELECT name, uuid, status, updatedAt, content FROM scripts`,
    );

    const scripts = [];
    for (const [name, id, status, updatedAt, content] of rows) {
      const script = new Script(name);
      script.id = id;
      script.status = status;
      script.updatedAt = new Date(updatedAt);
      script.content = content;
      scripts.push(script);
    }
    return scripts;
  }

  putSecret(secret: Secret): void {
    this.#db.query(
      `INSERT OR REPLACE INTO secrets (script, name, value) VALUES (?, ?, ?)`,
      [secret.script, secret.name, secret.value],
    );
  }

  getSecrets(script: string): Secret[] {
    const rows = this.#db.query(
      `SELECT script, name, value FROM secrets WHERE script = ?`,
      [script],
    );

    const secrets = [];
    for (const [script, name, value] of rows) {
      const secret = new Secret(script, name);
      secret.value = value;
      secrets.push(secret);
    }

    return secrets;
  }

  putKeyValue(kv: KeyValue): void {
    this.#db.query(
      `INSERT OR REPLACE INTO kv (namespace, name, value) VALUES (?, ?, ?)`,
      [kv.namespace, kv.name, kv.value],
    );
  }

  getKeyValue(kv: KeyValue): KeyValue | undefined {
    const rows = this.#db.query(
      `SELECT value FROM kv WHERE namespace = ? AND name = ?`,
      [kv.namespace, kv.name],
    );

    for (const [value] of rows) {
      kv.value = value;
      return kv;
    }

    return undefined;
  }
}
