import {
  Application,
  readAll,
  Router as OakRouter,
  RouterContext,
} from "../deps.ts";
import { Script, Secret } from "./model.ts";
import { Store } from "./datastore.ts";
import { Router } from "./router.ts";
import { Config } from "../config.ts";

const plainScriptTypes = [
  "text/plain",
  "application/octet-stream",
  "application/javascript",
  "application/x-javascript",
  "application/typescript",
  "application/x-typescript",
];

function scriptToJson(script: Script): Record<string, any> {
  return {
    name: script.name,
    id: script.id,
    nameId: script.nameId(),
    status: script.status,
    updatedAt: script.updatedAt.toISOString(),
  };
}

export class ApiServer {
  #store: Store;

  constructor(store: Store) {
    this.#store = store;
  }

  respondSuccess(context: RouterContext, result: any): void {
    context.response.body = {
      success: true,
      errors: [],
      messages: [],
      result,
    };
  }

  respondErrors(context: RouterContext, errors: any[]): void {
    context.response.body = {
      success: false,
      errors,
      messages: [],
      result: null,
    };
  }

  async handlePutScript(context: RouterContext): Promise<void> {
    const request = context.request;
    const type = request.headers.get("content-type") || "";

    const script = new Script(context.params.script_name || "");

    if (plainScriptTypes.includes(type)) {
      script.content = await readAll(request.body({ type: "reader" }).value);
    } else if (type.startsWith("multipart/form-data")) {
      const body = context.request.body({ type: "form-data" });
      const data = await body.value.read({ maxSize: 1 * 1024 * 1024 });
      for (const file of data.files || []) {
        if (plainScriptTypes.includes(file.contentType)) {
          script.content = file.content;
        }
      }
    }

    if (script.name === "" || script.content == undefined) {
      this.respondErrors(context, [
        { message: "No script found" },
      ]);
      return;
    }

    await this.#store.putScript(script);

    this.respondSuccess(context, { script: scriptToJson(script) });
  }

  async handleGetScripts(context: RouterContext): Promise<void> {
    const scripts = this.#store.getScripts().map(scriptToJson);

    return this.respondSuccess(context, { scripts });
  }

  async handleGetScriptContent(context: RouterContext): Promise<void> {
    const scriptName = context.params.script_name;
    if (!scriptName) {
      this.respondErrors(context, [
        { message: "No script name or ID given" },
      ]);
      return;
    }

    const script = await this.#store.getScript(scriptName);
    if (!script) {
      this.respondErrors(context, [
        { message: "No script with given ID or name found" },
      ]);
      return;
    }

    context.response.headers.set("content-type", "application/javascript");
    context.response.body = script.content;
  }

  async handleDeleteScript(context: RouterContext): Promise<void> {
    const scriptName = context.params.script_name;
    if (!scriptName) {
      this.respondErrors(context, [
        { message: "No script name or ID given" },
      ]);
      return;
    }

    const ok = await this.#store.deleteScript(scriptName);
    if (!ok) {
      this.respondErrors(context, [
        { message: "No script with given ID or name found" },
      ]);
      return;
    }

    return this.respondSuccess(context, {});
  }

  async handlePutSecret(context: RouterContext): Promise<void> {
    const scriptName = context.params.script_name;
    if (!scriptName) {
      this.respondErrors(context, [
        { message: "No script name or ID given" },
      ]);
      return;
    }

    const body = await context.request.body({ type: "json" }).value;

    const secrets = [];
    const secretPairs = body.secrets as Record<string, string>;
    for (const [name, value] of Object.entries(secretPairs)) {
      const secret = new Secret(scriptName, name);
      secret.value = value;
      secrets.push(secret);
    }
    this.#store.putSecrets(scriptName, secrets);

    return this.respondSuccess(context, {
      secrets: secrets.map((s) => {
        return { script: s.script, name: s.name };
      }),
    });
  }
}

export async function runServer(store: Store, router: Router): Promise<void> {
  const server = new ApiServer(store);
  const oakRouter = new OakRouter();
  oakRouter
    .get("/", (context) => {
      context.response.body = "Hello world!";
    })
    .get("/v1/scripts", (ctx) => server.handleGetScripts(ctx))
    .put("/v1/scripts/:script_name", (ctx) => server.handlePutScript(ctx))
    .get(
      "/v1/scripts/:script_name/bundle.js",
      (ctx) => server.handleGetScriptContent(ctx),
    )
    .delete("/v1/scripts/:script_name", (ctx) => server.handleDeleteScript(ctx))
    .put("/v1/secrets/:script_name", (ctx) => server.handlePutSecret(ctx));

  const app = new Application();

  app.addEventListener("error", (evt) => {
    // Will log the thrown error to the console.
    console.log(evt.error);
  });

  // Logger
  app.use(async (ctx, next) => {
    await next();
    const rt = ctx.response.headers.get("X-Response-Time");
    console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
  });

  // Timing
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.response.headers.set("X-Response-Time", `${ms}ms`);
  });

  app.use(async (ctx, next) => {
    const host = ctx.request.url.host;
    if (!router.handles(host)) {
      await next();
      return;
    }

    await router.proxy(ctx);
  });

  app.use(oakRouter.routes());
  app.use(oakRouter.allowedMethods());

  const { addr } = store.config;
  console.log(`[api] running at http://${addr}`);

  await app.listen(addr);
}
