import Client from "./api.ts";

export default async function deleteCommand(
  args: Record<string, any>,
): Promise<void> {
  const name = args._.shift();

  const client = new Client();
  await client.deleteScript(name);
}
