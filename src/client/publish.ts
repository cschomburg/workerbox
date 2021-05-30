import Client from "./api.ts";

export default async function publishCommand(
  args: Record<string, any>,
): Promise<void> {
  const root = args._.shift();
  const result = await Deno.emit(root, {
    bundle: "module",
    check: false,
  });

  const scriptFile = result.files["deno:///bundle.js"];

  const client = new Client();
  await client.putWorkerScript("hello-world", scriptFile);
}
