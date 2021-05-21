interface Script {
  name: string;
  id: string;
  content: string;
}

interface ScriptCommand {
  action: "runScript";
  script: Script;
}

type Command = ScriptCommand;

type Responder = (r: Response | Promise<Response>) => Promise<void>;

class FetchEvent extends Event {
  #request;
  #respondWith;
  #responded;

  get request() {
    return this.#request;
  }

  constructor(request: Request, respondWith: Responder) {
    super("fetch");
    this.#request = request;
    this.#respondWith = respondWith;
    this.#responded = false;
  }

  respondWith(response: Response) {
    if (this.#responded === true) {
      throw new TypeError("Already responded to this FetchEvent.");
    } else {
      this.#responded = true;
    }
    this.#respondWith(response).catch((err: Error) => console.warn(err));
  }

  [Symbol.toStringTag]() {
    return "FetchEvent";
  }
}

let server: Deno.Listener;

async function handleConn(conn: Deno.Conn) {
  const http = Deno.serveHttp(conn);
  for await (const { request, respondWith } of http) {
    self.dispatchEvent(new FetchEvent(request, respondWith));
  }
}

async function startListen(): Promise<void> {
  server = Deno.listen({
    hostname: "127.0.0.1",
    port: 0,
    transport: "tcp",
  });

  const addr = server.addr as Deno.NetAddr;
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

async function runScript(script: Script): Promise<void> {
  console.log("[worker] running script", script.name);
  const blob = new Blob([script.content]);
  const url = URL.createObjectURL(blob);
  const mod = await import(url);

  await startListen();
}

onmessage = function (e: MessageEvent) {
  const command = e.data as Command;
  if (command.action === "runScript") {
    runScript(command.script);
  }
};
