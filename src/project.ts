import { toml } from "./deps.ts";

export const PROJECT_FILE = "workerbox.toml";

export class ProjectConfig {
  name = "";
  routes: string[] = [];
  server_url = "";
  secrets: Record<string, string> = {};
}

class ConfigError extends Error {
  constructor(field: string, expected: string, value: unknown) {
    super(
      `Could not parse config "${field}: expected ${expected}, got ${typeof value}`,
    );
  }
}

function asString(field: string, value: unknown, defaults: string): string {
  if (typeof value === "undefined") {
    return defaults;
  }
  if (typeof value !== "string") {
    throw new ConfigError(field, "string", value);
  }

  return value;
}

function asStringArray(field: string, value: unknown): string[] {
  if (typeof value === "undefined") {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ConfigError(field, "string[]", value);
  }
  return value.map((v) => asString(field, v, ""));
}

function asStringRecord(field: string, value: unknown): Record<string, string> {
  if (typeof value === "undefined") {
    return {};
  }
  if (typeof value !== "object") {
    throw new ConfigError(field, "Record<string, string>", value);
  }
  let object = value as Record<string, unknown>;

  const record: Record<string, string> = {};
  for (let key in object) {
    record[key] = asString(`${field}.${key}`, object[key], "");
  }
  return record;
}

export async function parseProjectConfig(file: string): Promise<ProjectConfig> {
  const contents = await Deno.readTextFile(file);
  const body = toml.parse(contents);
  const config = new ProjectConfig();

  config.name = asString("name", body.name, "");
  config.server_url = asString("server_url", body.server_url, "");
  config.routes = asStringArray("routes", body.routes);
  config.secrets = asStringRecord("secrets", body.secrets);

  return config;
}

export async function writeProjectConfig(
  file: string,
  config: ProjectConfig,
): Promise<void> {
  const contents = toml.stringify(config as unknown as Record<string, unknown>);
  await Deno.writeTextFile(file, contents);
}

export async function maybeLoadProjectConfig(): Promise<ProjectConfig> {
  try {
    await Deno.stat(PROJECT_FILE);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return new ProjectConfig();
    } else {
      throw error;
    }
  }

  return parseProjectConfig(PROJECT_FILE);
}
