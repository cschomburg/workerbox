import { Script } from "./model.ts";
import { Runner } from "./runner.ts";
import { Router } from "./router.ts";

export class Store {
  #runner: Runner;
  #router: Router;

  constructor() {
    this.#runner = new Runner();
    this.#router = new Router();

    this.#router.handleEvents();
  }

  async putScript(script: Script): Promise<void> {
    this.#runner.startScript(script);
  }

  getRouter(): Router {
    return this.#router;
  }
}

export default new Store();
