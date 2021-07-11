import { runServer } from "./api.ts";
import Store from "./datastore.ts";
import { Runner as StandaloneRunner } from "./runners/standalone.ts";
import { Runner as DectylRunner } from "./runners/dectyl.ts";
import { Router } from "./router.ts";
import getConfig from "../config.ts";

export default async function serveCommand(
  args: Record<string, any>,
): Promise<void> {
  const cfg = getConfig();

  let runner;
  if (cfg.runner === "dectyl") {
    runner = new DectylRunner();
  } else {
    runner = new StandaloneRunner();
  }
  runner.handleEvents();

  const router = new Router(runner);
  router.handleEvents();

  await Store.startup();
  await runServer(router);
}
