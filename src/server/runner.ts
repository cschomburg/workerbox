import { Script, Secret } from "./model.ts";
import Store from "./datastore.ts";
import { ScriptNamePayload, ScriptPayload } from "./eventbus.ts";

interface ReadyMessage {
  action: "ready";
  address: string;
}

type WorkerMessage = ReadyMessage;

class WorkerState {
  script: Script;
  worker: Worker;

  constructor(script: Script, worker: Worker) {
    this.script = script;
    this.worker = worker;
  }
}

export class Runner {
  #workers = new Map<string, WorkerState>();

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

        if (event.name === "scriptSecretsChanged") {
          const { script } = event.value[0] as ScriptNamePayload;
          await this.updateEnvironment(script);
        }
      } catch (e) {
        console.error("[runner]", e);
      }
    }
  }

  async startScript(script: Script): Promise<void> {
    const url = new URL("../runtime/worker.js", import.meta.url);
    const worker = new Worker(url.href, {
      type: "module",
      deno: {
        namespace: true,
      },
    });

    const state = new WorkerState(script, worker);
    this.#workers.set(script.id, state);

    worker.onerror = (err) => {
      console.log(`[runner] worker ${script.name} error:`, err);
    };

    worker.addEventListener("message", (e: MessageEvent) => {
      this.handleWorkerMessage(state, e);
    });

    console.log(`[runner] started worker for ${script.nameId()}`);

    const secrets = await Store.getSecrets(script.name);
    this.updateWorkerEnvironment(state, secrets);

    worker.postMessage({
      action: "runScript",
      script: {
        name: script.name,
        id: script.id,
        content: script.content,
      },
    });
  }

  async stopScript(script: Script): Promise<void> {
    const state = this.#workers.get(script.id);
    if (!state) {
      throw new Error(`worker for script ${script.nameId()} not found`);
    }

    state.worker.terminate();
    this.#workers.delete(script.id);
    Store.updateScriptStatus(script, "stopped");

    console.log(`[runner] stopped worker for ${script.nameId()}`);
  }

  async updateEnvironment(scriptName: string): Promise<void> {
    const secrets = await Store.getSecrets(scriptName);

    for (const [id, state] of this.#workers) {
      if (state.script.name === scriptName) {
        this.updateWorkerEnvironment(state, secrets);
      }
    }
  }

  async updateWorkerEnvironment(
    state: WorkerState,
    secrets: Secret[],
  ): Promise<void> {
    state.worker.postMessage({
      action: "updateSecrets",
      secrets,
    });
  }

  async handleWorkerMessage(
    state: WorkerState,
    e: MessageEvent,
  ): Promise<void> {
    const msg = e.data as WorkerMessage;
    if (msg.action === "ready") {
      console.log("[runner] worker signaled ready");
      state.script.url = msg.address; // TODO: fixme

      Store.updateScriptStatus(state.script, "running");
    }
  }
}
