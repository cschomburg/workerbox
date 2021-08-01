import { runServer } from "./api.ts";
import { Store } from "./datastore.ts";
import { Runner as StandaloneRunner } from "./runners/standalone.ts";
import { Runner as DectylRunner } from "./runners/dectyl.ts";
import { Router } from "./router.ts";
import getConfig from "../config.ts";

export default async function serveCommand(
  args: Record<string, any>,
): Promise<void> {
  const cfg = getConfig();
  const store = new Store(cfg);

  let runner;
  if (cfg.runner === "dectyl") {
    runner = new DectylRunner(store);
  } else {
    runner = new StandaloneRunner(store);
  }
  runner.handleEvents();

  const router = new Router(store, runner);
  router.handleEvents();

  await store.startup();
  await runServer(store, router);
}
