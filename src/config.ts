function env(key: string, defaultValue: string): string {
  return Deno.env.get("WORKERBOX_" + key) || defaultValue;
}

export class Config {
  domain = env("DOMAIN", "workers.local");
  db = env("DB", "workerbox.db");
}

export default function getConfig(): Config {
  return new Config();
}
