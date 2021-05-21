class FetchEvent extends Event {
  #request;
  #respondWith;
  #responded;

  get request() {
    return this.#request;
  }

  /**
   * @param {Request} request
   * @param {Response | Promise<Response>} respondWith
   */
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

window.FetchEvent = FetchEvent;

async function handleConn(conn: Deno.Conn) {
  const http = Deno.serveHttp(conn);
  for await (const { request, respondWith } of http) {
    window.dispatchEvent(new FetchEvent(request, respondWith));
  }
}

export function shim(addr) {
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = (type, handler) => {
    if (type === "fetch") {
      serve(addr);
    }
    originalAddEventListener(type, handler);
  };
}
