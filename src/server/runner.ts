import { Script } from "./model.ts";
import EventBus, { Events } from "./eventbus.ts";

interface ReadyMessage {
  action: "ready";
  address: string;
}

type WorkerMessage = ReadyMessage;

export class Runner {
  #workers = new Map<string, Worker>();

  startScript(script: Script): void {
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
      script.status = "running";
      script.url = msg.address;

      EventBus.emit("scriptStatusChanged", { script });
    }
  }
}
