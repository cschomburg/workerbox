import Client from "./api.ts";

export default async function scriptsCommand(
  args: Record<string, any>,
): Promise<void> {
  const client = new Client();
  await client.getScripts();
}
