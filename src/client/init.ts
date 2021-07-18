import { parseArgs } from "../deps.ts";
import { ProjectConfig, writeProjectConfig } from "../project.ts";
import getConfig from "../config.ts";

const usage = `workerbox-init

USAGE:
    workerbox init <project_name>

OPTIONS:
    -a, --all    Also include global config
`;

export default async function initCommand(
  args: Record<string, any>,
): Promise<void> {
  args = parseArgs(args._, {
    boolean: ["all"],
    alias: {
      "help": "h",
      "all": "a",
    },
  });

  if (args.help || args._.length < 1) {
    console.log(usage);
    Deno.exit(0);
  }

  const name = args._.shift();
  const config = new ProjectConfig();
  config.name = name;

  if (!config.name) {
    console.log(usage);
    Deno.exit(1);
  }

  if (args.a || args.all) {
    const globalConfig = getConfig();
    config.routes = [`${config.name}.${globalConfig.domain}`];
    config.server_url = globalConfig.url;
  }

  await writeProjectConfig("workerbox.toml", config);
}
