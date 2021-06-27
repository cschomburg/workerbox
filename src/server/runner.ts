import { Script } from "./model.ts";
import Store from "./datastore.ts";

interface ReadyMessage {
  action: "ready";
  address: string;
}

type WorkerMessage = ReadyMessage;

export class Runner {
  #workers = new Map<string, Worker>();

  async handleEvents(): Promise<void> {
    for await (const event of Store.eventBus) {
      try {
        if (event.name === "scriptStatusChanged") {
          const { script } = event.value[0];

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
    const url = new URL("../runtime/worker.ts", import.meta.url);
    const worker = new Worker(url.href, {
      type: "module",
      deno: {
        namespace: true,
      },
    });
    this.#workers.set(script.id, worker);

    worker.onerror = (err) => {
      console.log(`[runner] worker ${script.name} error:`, err);
    };

    console.log(`[runner] started worker for ${script.nameId()}`);

    worker.postMessage({
      action: "runScript",
      script: {
        name: script.name,
        id: script.id,
        content: script.content,
      },
    });

    worker.addEventListener("message", (e: MessageEvent) => {
      this.handleWorkerMessage(script, worker, e);
    });
  }

  async stopScript(script: Script): Promise<void> {
    const worker = this.#workers.get(script.id);
    if (!worker) {
      throw new Error(`worker for script ${script.nameId()} not found`);
    }

    worker.terminate();
    this.#workers.delete(script.id);
    Store.updateScriptStatus(script, "stopped");

    console.log(`[runner] stopped worker for ${script.nameId()}`);
  }

  async handleWorkerMessage(
    script: Script,
    worker: Worker,
    e: MessageEvent,
  ): Promise<void> {
    const msg = e.data as WorkerMessage;
    if (msg.action === "ready") {
      console.log("[runner] worker signaled ready");
      script.url = msg.address; // TODO: fixme

      Store.updateScriptStatus(script, "running");
    }
  }
}
