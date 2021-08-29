import { path } from "../../deps.ts";
import { Script, Secret } from "../model.ts";
import { Store } from "../datastore.ts";
import { ScriptNamePayload, ScriptPayload } from "../eventbus.ts";

interface ReadyMessage {
  action: "ready";
  address: string;
}

type WorkerMessage = ReadyMessage;

class WorkerState {
  script: Script;
  worker: Worker;
  url?: string;

  constructor(script: Script, worker: Worker) {
    this.script = script;
    this.worker = worker;
  }
}

export class Runner {
  #store: Store;
  #workers = new Map<string, WorkerState>();

  constructor(store: Store) {
    this.#store = store;
  }

  async handleEvents(): Promise<void> {
    for await (const event of this.#store.eventBus) {
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
    const url = new URL("../../runtime/worker.js", import.meta.url);
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
      err.preventDefault();
      this.stopScript(script);
    };

    worker.addEventListener("message", (e: MessageEvent) => {
      this.handleWorkerMessage(state, e);
    });

    console.log(`[runner] started worker for ${script.nameId()}`);

    const secrets = await this.#store.getSecrets(script.name);
    this.updateWorkerEnvironment(state, secrets);

    const dbPath = path.join(
      this.#store.config.datadir,
      `worker-${script.name}.db`,
    );

    worker.postMessage({
      action: "runScript",
      script: {
        name: script.name,
        id: script.id,
        content: script.content,
        dbPath,
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
    this.#store.updateScriptStatus(script, "stopped");

    console.log(`[runner] stopped worker for ${script.nameId()}`);
  }

  async updateEnvironment(scriptName: string): Promise<void> {
    const secrets = await this.#store.getSecrets(scriptName);

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
      state.url = msg.address;
      this.#store.updateScriptStatus(state.script, "running");
    }
  }

  async fetch(scriptId: string, request: Request): Promise<Response> {
    const state = this.#workers.get(scriptId);
    if (!state) {
      throw new Error(`worker for script ${scriptId} not found`);
    }
    const targetHost = state.url;
    if (!targetHost) {
      throw new Error(`worker for script ${scriptId} has no target`);
    }

    const url = new URL(request.url.toString());
    const target = new URL(targetHost);
    url.protocol = target.protocol;
    url.hostname = target.hostname;
    url.port = target.port;

    const upstream = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const response = await fetch(upstream);

    return response;
  }
}
