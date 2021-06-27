import { runServer } from "./api.ts";
import Store from "./datastore.ts";
import { Runner } from "./runner.ts";
import { Router } from "./router.ts";

export default async function serveCommand(
  args: Record<string, any>,
): Promise<void> {
  const runner = new Runner();
  runner.handleEvents();

  const router = new Router();
  router.handleEvents();

  await Store.startup();
  await runServer(router);
}
