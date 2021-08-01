import { StorageArea } from '../deps.ts';

class FetchEvent extends Event {
  #request;
  #respondWith;
  #responded;

  get request() {
    return this.#request;
  }

  constructor(request, respondWith) {
    super("fetch");
    this.#request = request;
    this.#respondWith = respondWith;
    this.#responded = false;
  }

  respondWith(response) {
    if (this.#responded === true) {
      throw new TypeError("Already responded to this FetchEvent.");
    } else {
      this.#responded = true;
    }
    this.#respondWith(response).catch((err) => console.warn(err));
  }

  [Symbol.toStringTag]() {
    return "FetchEvent";
  }
}

let server;

async function handleConn(conn) {
  const http = Deno.serveHttp(conn);
  for await (const { request, respondWith } of http) {
    try {
        self.dispatchEvent(new FetchEvent(request, respondWith));
    } catch (err) {
        console.warn(err);
        respondWith(new Response("internal error in worker", {
            status: 500,
        }));
    }
  }
}

async function startListen() {
  server = Deno.listen({
    hostname: "127.0.0.1",
    port: 0,
    transport: "tcp",
  });

  const addr = server.addr;
  const baseUrl = `http://${addr.hostname}:${addr.port}`;

  self.postMessage({
    action: "ready",
    address: baseUrl,
  });

  console.log("[worker] listening at", baseUrl);

  for await (const conn of server) {
    handleConn(conn).catch((err) => console.warn(err));
  }
}

async function runScript(script) {
  console.log("[worker] running script", script.name);

  globalThis.StorageArea = StorageArea;
  globalThis.DENO_STORAGE_AREA__DEFAULT_URL = `sqlite://${script.dbPath}`;

  const blob = new Blob([script.content]);
  const url = URL.createObjectURL(blob);
  const mod = await import(url);

  await startListen();
}

async function updateSecrets(secrets) {
  secrets.forEach((secret) => {
    console.log("[worker] update secret", secret.name);
    globalThis[secret.name] = secret.value;
  });
}

onmessage = function (e) {
  const command = e.data;
  if (command.action === "runScript") {
    runScript(command.script);
  }
  if (command.action === "updateSecrets") {
    updateSecrets(command.secrets);
  }
};
