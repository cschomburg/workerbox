import { Database } from "./db.ts";
import { Script } from "./model.ts";
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
    this.#db = new Database(getConfig().db);
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
    this.#db.updateScriptStatus(script);
    this.#eventBus.emit("scriptStatusChanged", { script });

    console.log(
      "[store] script status changed:",
      script.nameId(),
      script.status,
    );
  }
}

export default new Store();
