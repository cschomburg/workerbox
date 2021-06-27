import Client from "./api.ts";

const usage = `workerbox-secret

Usage: workerbox secret <SUBCOMMAND>

SUBCOMMANDS
    put         Create or update a secret variable
`;

export default async function secretCommand(
  args: Record<string, any>,
): Promise<void> {
  const cmd = args._.shift();
  switch (cmd) {
    case "put":
      await putSecretCommand(args);
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

export async function putSecretCommand(
  args: Record<string, any>,
): Promise<void> {
  const scriptName = args._.shift();
  const secretName = args._.shift();
  const secretValue = args._.shift();

  const client = new Client();
  await client.putSecret(scriptName, secretName, secretValue);
}
