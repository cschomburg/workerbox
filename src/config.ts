function env(key: string, defaultValue: string): string {
  return Deno.env.get("WORKERBOX_" + key) || defaultValue;
}

export class Config {
  addr = env("ADDR", "0.0.0.0:8081");
  url = env("URL", "http://127.0.0.1:8081");
  domain = env("DOMAIN", "workers.local");
  db = env("DB", "workerbox.db");
  runner = env("RUNNER", "standalone");
}

export default function getConfig(): Config {
  return new Config();
}
