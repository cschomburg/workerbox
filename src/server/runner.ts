import { Script } from "./model.ts";
import EventBus, { Events } from "./eventbus.ts";

interface ReadyMessage {
  action: "ready";
  address: string;
}

type WorkerMessage = ReadyMessage;

export class Runner {
  startScript(script: Script): void {
    const url = new URL("../runtime/worker.ts", import.meta.url);
    const worker = new Worker(url.href, {
      type: "module",
      deno: {
        namespace: true,
      },
    });

    worker.onerror = (err) => {
      console.log(`[runner] worker ${script.name} error:`, err);
    };

    console.log(`[runner] started worker for ${script.name}-${script.id}`);

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

  stopScript(script: Script): void {
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
