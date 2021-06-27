import { parseArgs } from "./src/deps.ts";
import serveCommand from "./src/server/serve.ts";
import publishCommand from "./src/client/publish.ts";
import scriptsCommand from "./src/client/scripts.ts";
import deleteCommand from "./src/client/delete.ts";
import secretCommand from "./src/client/secret.ts";

const usage = `workerbox
Run a workerbox or interact with the workerbox API.

SUBCOMMANDS
    serve       Run a workerbox server
    publish     Publish your worker to workerbox.
    scripts     List all scripts on server
    delete      Deletes a script by name or ID
    secret      Interact with secret variables
`;

export default async function mainCommand(): Promise<void> {
  const args = parseArgs(Deno.args, {
    alias: {
      "help": "h",
    },
  });

  const cmd = args._.shift();
  switch (cmd) {
    case "serve":
      await serveCommand(args);
      break;

    case "publish":
      await publishCommand(args);
      break;

    case "scripts":
      await scriptsCommand(args);
      break;

    case "delete":
      await deleteCommand(args);
      break;

    case "secret":
      await secretCommand(args);
      break;

    default:
      if (args.help) {
        console.log(usage);
        Deno.exit(0);
      }
      console.error(usage);
      Deno.exit(1);
  }
}

await mainCommand();
