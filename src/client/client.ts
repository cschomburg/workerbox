import { parseArgs } from "./deps.ts";
import publishCommand from "./publish.ts";

const usage = `deployer
Interact with the overseer worker API.

SUBCOMMANDS
    publish     Publish your worker to overseer.
`;

export default async function mainCommand(): Promise<void> {
  const args = parseArgs(Deno.args, {
    alias: {
      "help": "h",
    },
  });

  const cmd = args._.shift();
  switch (cmd) {
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
