import Store from "./datastore.ts";
import { Context } from "../deps.ts";
import { Script } from "./model.ts";
import { Config } from "../config.ts";
import { ScriptPayload } from "./eventbus.ts";
import { FetchUpstream } from "./interfaces.ts";

export class Router {
  #domain: string;
  #routes: Map<string, Script>;
  #upstream: FetchUpstream;

  constructor(config: Config, upstream: FetchUpstream) {
    this.#domain = config.domain;
    this.#routes = new Map<string, Script>();
    this.#upstream = upstream;
  }

  async handleEvents(): Promise<void> {
    console.log("[router] running on domain", "*." + this.#domain);

    for await (const event of Store.eventBus) {
      try {
        if (event.name === "scriptStatusChanged") {
          const { script } = event.value[0] as ScriptPayload;

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
    return this.getTarget(route) != undefined;
  }

  handles(route: string): boolean {
    return route.endsWith("." + this.#domain);
  }

  put(route: string, script: Script): void {
    console.log(`[router] routing ${route} to ${script.nameId()}`);
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

  getTarget(route: string): Script | undefined {
    route = this.trimDomain(route);
    if (route === "") {
      return undefined;
    }

    return this.#routes.get(route);
  }

  async proxy(ctx: Context): Promise<void> {
    const url = ctx.request.url;
    const script = this.getTarget(url.host);
    if (script == undefined) {
      ctx.response.status = 404;
      ctx.response.body = "not found";
      return;
    }

    const request = new Request(url.toString(), {
      method: ctx.request.method,
      headers: ctx.request.headers,
      body: ctx.request.hasBody
        ? ctx.request.body({ type: "stream" }).value
        : undefined,
    });

    let response;
    try {
      response = await this.#upstream.fetch(script.id, request);
    } catch (e) {
      console.log(`[router] error running script ${script.nameId()}:`, e);
      ctx.response.status = 500;
      ctx.response.body = "internal error";
      return;
    }

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
