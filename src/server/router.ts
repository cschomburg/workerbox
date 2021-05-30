import EventBus from "./eventbus.ts";
import { Context } from "../deps.ts";

export class Router {
  #domain = "workers.local";
  #routes: Map<string, string>;

  constructor() {
    this.#routes = new Map<string, string>();
  }

  async handleEvents(): Promise<void> {
    for await (const event of EventBus) {
      if (event.name === "scriptStatusChanged") {
        const { script } = event.value[0];
        if (script.status === "running") {
          this.put(script.name, script.url);
          this.put(script.nameId(), script.url);
        }
      }
    }
  }

  has(route: string): boolean {
    return this.getTarget(route) !== "";
  }

  put(route: string, target: string): void {
    console.log(`[router] routing ${route} to ${target}`);
    this.#routes.set(route, target);
  }

  getTarget(route: string): string {
    route = this.trimDomain(route);
    if (route === "") {
      return "";
    }

    const target = this.#routes.get(route);
    if (!target) {
      return "";
    }

    return target;
  }

  async proxy(ctx: Context): Promise<void> {
    const url = new URL(ctx.request.url.toString());
    const target = new URL(this.getTarget(url.host));
    url.protocol = target.protocol;
    url.hostname = target.hostname;
    url.port = target.port;

    const request = new Request(url.toString(), {
      method: ctx.request.method,
      headers: ctx.request.headers,
      body: ctx.request.hasBody
        ? ctx.request.body({ type: "stream" }).value
        : undefined,
    });

    const response = await fetch(request);

    ctx.response.headers = new Headers(response.headers);
    ctx.response.status = response.status;
    ctx.response.body = response.body;
  }

  trimDomain(host: string): string {
    if (!host.endsWith("." + this.#domain)) {
      return "";
    }

    return host.slice(0, -this.#domain.length - 1);
  }
}
