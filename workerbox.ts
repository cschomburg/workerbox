import { parseArgs } from "./src/deps.ts";
import publishCommand from "./src/client/publish.ts";
import { runServer } from "./src/server/server.ts"

const usage = `workerbox
Run a workerbox or interact with the workerbox API.

SUBCOMMANDS
    serve       Run a workerbox server
    publish     Publish your worker to workerbox.
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
        await runServer();
        break;

    case "publish":
      await publishCommand(args);
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
