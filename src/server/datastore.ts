import { path } from "../deps.ts";
import { Database } from "./db.ts";
import { KeyValue, Script, Secret } from "./model.ts";
import { EventBus } from "./eventbus.ts";
import getConfig from "../config.ts";

function scriptMatchesSelector(script: Script, selector: string): boolean {
  return script.id === selector ||
    script.name === selector ||
    script.nameId() === selector;
}

export class Store {
  #db: Database;
  #eventBus: EventBus;

  constructor() {
    const db = path.join(getConfig().datadir, "workerbox.db");
    this.#db = new Database(db);
    this.#eventBus = new EventBus();
  }

  get eventBus(): EventBus {
    return this.#eventBus;
  }

  getScripts(): Script[] {
    return this.#db.getScripts();
  }

  async startup(): Promise<void> {
    const scripts = this.getScripts();

    // Cleanup old invalid states
    for (const script of scripts) {
      if (["pending", "starting", "running"].includes(script.status)) {
        this.updateScriptStatus(script, "pending");
      }

      if (script.status === "stopping") {
        this.updateScriptStatus(script, "stopped");
      }
    }
  }

  async getScript(scriptName: string): Promise<Script | null> {
    const scripts = this.getScripts()
      .filter((script) => scriptMatchesSelector(script, scriptName));

    if (scripts.length === 0) {
      return null;
    }

    return scripts[0];
  }

  async putScript(script: Script): Promise<void> {
    this.#db.putScript(script);
    this.updateScriptStatus(script, "pending");
  }

  async deleteScript(scriptName: string): Promise<boolean> {
    const scripts = this.getScripts()
      .filter((script) => scriptMatchesSelector(script, scriptName));

    if (scripts.length === 0) {
      return false;
    }

    for (const script of scripts) {
      if (script.status === "running") {
        this.updateScriptStatus(script, "stopping");
      }
    }

    return true;
  }

  async updateScriptStatus(script: Script, status: string): Promise<void> {
    script.status = status;
    script.updatedAt = new Date();
    this.#db.updateScriptStatus(script);
    this.#eventBus.emit("scriptStatusChanged", { script });

    console.log(
      "[store] script status changed:",
      script.nameId(),
      script.status,
    );
  }

  async putSecrets(script: string, secrets: Secret[]): Promise<void> {
    secrets.forEach((secret) => this.#db.putSecret(secret));
    this.#eventBus.emit("scriptSecretsChanged", { script });
  }

  async getSecrets(script: string): Promise<Secret[]> {
    return this.#db.getSecrets(script);
  }

  async putKeyValue(kv: KeyValue): Promise<void> {
    this.#db.putKeyValue(kv);
  }

  async getKeyValue(kv: KeyValue): Promise<KeyValue | undefined> {
    return this.#db.getKeyValue(kv);
  }
}

export default new Store();
