import Store from "./datastore.ts";
import { Context } from "../deps.ts";
import { Script } from "./model.ts";
import getConfig from "../config.ts";

export class Router {
  #domain = getConfig().domain;
  #routes: Map<string, Script>;

  constructor() {
    this.#routes = new Map<string, Script>();
  }

  async handleEvents(): Promise<void> {
    console.log("[router] running on domain", "*." + this.#domain);

    for await (const event of Store.eventBus) {
      try {
        if (event.name === "scriptStatusChanged") {
          const { script } = event.value[0];

          if (script.status === "running") {
            this.put(script.name, script);
            this.put(script.nameId(), script);
          }

          if (script.status === "stopping" || script.status === "stopped") {
            this.delete(script);
          }
        }
      } catch (e) {
        console.error("[router]", e);
      }
    }
  }

  has(route: string): boolean {
    return this.getTarget(route) !== "";
  }

  handles(route: string): boolean {
    return route.endsWith("." + this.#domain);
  }

  put(route: string, script: Script): void {
    console.log(`[router] routing ${route} to ${script.url}`);
    this.#routes.set(route, script);
  }

  delete(script: Script): void {
    for (const [route, routeScript] of this.#routes) {
      if (routeScript.id === script.id) {
        this.#routes.delete(route);
        console.log(`[router] delete route ${route}`);
      }
    }
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

    return target.url;
  }

  async proxy(ctx: Context): Promise<void> {
    const url = new URL(ctx.request.url.toString());
    const targetHost = this.getTarget(url.host);
    if (targetHost == "") {
      ctx.response.status = 404;
      ctx.response.body = "not found";
      return;
    }

    const target = new URL(targetHost);
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
