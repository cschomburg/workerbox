import { createWorker } from "../../deps.ts";
import type { DeployWorker } from "../../deps.ts";
import { Script } from "../model.ts";
import Store from "../datastore.ts";
import { ScriptPayload } from "../eventbus.ts";
import getConfig, { Config } from "../../config.ts";

class WorkerState {
  script: Script;
  worker: DeployWorker;

  constructor(script: Script, worker: DeployWorker) {
    this.script = script;
    this.worker = worker;
  }
}

export class Runner {
  #workers = new Map<string, WorkerState>();
  #config: Config;

  constructor() {
    this.#config = getConfig();
  }

  async handleEvents(): Promise<void> {
    for await (const event of Store.eventBus) {
      try {
        if (event.name === "scriptStatusChanged") {
          const { script } = event.value[0] as ScriptPayload;

          if (script.status === "pending") {
            await this.startScript(script);
          }

          if (script.status === "stopping") {
            await this.stopScript(script);
          }
        }
      } catch (e) {
        console.error("[runner]", e);
      }
    }
  }

  async startScript(script: Script): Promise<void> {
    const url = `${this.#config.url}/v1/scripts/${script.nameId()}/bundle.js`;

    const env: Record<string, string> = {};
    const secrets = await Store.getSecrets(script.name);
    for (const secret of secrets) {
      if (secret.value != undefined) {
        env[secret.name] = secret.value || "";
      }
    }

    const worker = await createWorker(url, {
      env,
      name: script.nameId(),
      host: `${script.name}.${this.#config.domain}`,
    });

    const state = new WorkerState(script, worker);
    this.#workers.set(script.id, state);

    await worker.start();
    console.log(`[runner] started worker for ${script.nameId()}`);
    Store.updateScriptStatus(script, "running");
  }

  async stopScript(script: Script): Promise<void> {
    const state = this.#workers.get(script.id);
    if (!state) {
      throw new Error(`worker for script ${script.nameId()} not found`);
    }

    await state.worker.close();
    this.#workers.delete(script.id);
    Store.updateScriptStatus(script, "stopped");

    console.log(`[runner] stopped worker for ${script.nameId()}`);
  }

  async fetch(scriptId: string, request: Request): Promise<Response> {
    const state = this.#workers.get(scriptId);
    if (!state) {
      throw new Error(`worker for script ${scriptId} not found`);
    }

    const [response, _] = await state.worker.fetch(request);
    return response;
  }
}
