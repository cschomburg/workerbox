import {
  Application,
  readAll,
  Router as OakRouter,
  RouterContext,
} from "../deps.ts";
import { Script, Secret } from "./model.ts";
import Store from "./datastore.ts";
import { Router } from "./router.ts";
import getConfig from "../config.ts";

function respondSuccess(context: RouterContext, result: any): void {
  context.response.body = {
    success: true,
    errors: [],
    messages: [],
    result,
  };
}

function respondErrors(context: RouterContext, errors: any[]): void {
  context.response.body = {
    success: false,
    errors,
    messages: [],
    result: null,
  };
}

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

async function handlePutScript(context: RouterContext): Promise<void> {
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
    respondErrors(context, [
      { message: "No script found" },
    ]);
    return;
  }

  await Store.putScript(script);

  respondSuccess(context, { script: scriptToJson(script) });
}

async function handleGetScripts(context: RouterContext): Promise<void> {
  const scripts = Store.getScripts().map(scriptToJson);

  return respondSuccess(context, { scripts });
}

async function handleDeleteScript(context: RouterContext): Promise<void> {
  const scriptName = context.params.script_name;
  if (!scriptName) {
    respondErrors(context, [
      { message: "No script name or ID given" },
    ]);
    return;
  }

  const ok = await Store.deleteScript(scriptName);
  if (!ok) {
    respondErrors(context, [
      { message: "No script with given ID or name found" },
    ]);
    return;
  }

  return respondSuccess(context, {});
}

async function handlePutSecret(context: RouterContext): Promise<void> {
  const scriptName = context.params.script_name;
  if (!scriptName) {
    respondErrors(context, [
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
  Store.putSecrets(scriptName, secrets);

  return respondSuccess(context, {
    secrets: secrets.map((s) => {
      return { script: s.script, name: s.name };
    }),
  });
}

export async function runServer(router: Router): Promise<void> {
  const oakRouter = new OakRouter();
  oakRouter
    .get("/", (context) => {
      context.response.body = "Hello world!";
    })
    .get("/v1/scripts", handleGetScripts)
    .put("/v1/scripts/:script_name", handlePutScript)
    .delete("/v1/scripts/:script_name", handleDeleteScript)
    .put("/v1/secrets/:script_name", handlePutSecret);

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

  const { addr } = getConfig();
  console.log(`[api] running at http://${addr}`);

  await app.listen(addr);
}
