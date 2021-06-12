import { Script } from "./model.ts";
import { Runner } from "./runner.ts";
import { Router } from "./router.ts";

function scriptMatchesSelector(script: Script, selector: string): boolean {
  return script.id === selector ||
    script.name === selector ||
    script.nameId() === selector;
}

export class Store {
  #runner: Runner;
  #router: Router;
  #scripts: Map<string, Script>;

  constructor() {
    this.#runner = new Runner();
    this.#router = new Router();
    this.#scripts = new Map<string, Script>();

    this.#router.handleEvents();
  }

  getScripts(): Script[] {
    return [...this.#scripts.values()];
  }

  async putScript(script: Script): Promise<void> {
    this.#scripts.set(script.id, script);
    this.#runner.startScript(script);
  }

  async deleteScript(scriptName: string): Promise<boolean> {
    const scripts = [...this.#scripts.values()]
      .filter((script) => scriptMatchesSelector(script, scriptName));

    if (scripts.length === 0) {
      return false;
    }

    await Promise.all(scripts.map((script) => this.#runner.stopScript(script)));
    for (const script of scripts) {
      this.#scripts.delete(script.id);
    }

    return true;
  }

  getRouter(): Router {
    return this.#router;
  }
}

export default new Store();
