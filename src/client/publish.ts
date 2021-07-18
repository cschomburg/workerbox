import Client from "./api.ts";
import { maybeLoadProjectConfig } from "../project.ts";

const usage = `workerbox-publish

To publish a worker from a workerbox.toml:
    workerbox publish

To publish a worker without a config:
    workerbox publish hello-world ./worker.js

USAGE:
    workerbox publish <project_name> <file>
`;

export default async function publishCommand(
  args: Record<string, any>,
): Promise<void> {
  const project = await maybeLoadProjectConfig();
  let entrypoint = "worker.js";

  if (args._.length === 0) {
    if (!project.name) {
      console.error(
        'Could not load project from workerbox.toml. Did you run "workerbox init"?',
      );
      Deno.exit(1);
    }
  } else {
    project.name = args._.shift();
    if (args._.length > 0) {
      entrypoint = args._.shift();
    }
  }

  if (!project.name) {
    console.error(
      "No project name given",
    );
    Deno.exit(1);
  }

  const result = await Deno.emit(entrypoint, {
    bundle: "module",
    check: false,
  });

  const scriptFile = result.files["deno:///bundle.js"];

  const client = new Client(project.server_url);
  await client.putScript(project.name, scriptFile);
}
