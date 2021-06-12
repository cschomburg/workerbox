import { Application, Router, RouterContext } from "../deps.ts";
import { Script } from "./model.ts";
import Store from "./datastore.ts";

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

async function handlePutScript(context: RouterContext): Promise<void> {
  const request = context.request;
  const type = request.headers.get("content-type") || "";

  const script = new Script(context.params.script_name || "");

  if (plainScriptTypes.includes(type)) {
    script.content = await request.body({ type: "text" }).value;
  } else if (type.startsWith("multipart/form-data")) {
    const body = context.request.body({ type: "form-data" });
    const data = await body.value.read({ maxSize: 1 * 1024 * 1024 });
    for (const file of data.files || []) {
      if (plainScriptTypes.includes(file.contentType)) {
        script.content = new TextDecoder().decode(file.content);
      }
    }
  }

  if (script.name === "" || script.content === "") {
    respondErrors(context, [
      { message: "No script found" },
    ]);
    return;
  }

  await Store.putScript(script);

  respondSuccess(context, { script });
}

async function handleGetScripts(context: RouterContext): Promise<void> {
  const scripts = Store.getScripts();
  for (const script of scripts) {
    script.content = "";
  }

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

export async function runServer(): Promise<void> {
  const router = new Router();
  router
    .get("/", (context) => {
      context.response.body = "Hello world!";
    })
    .get("/v1/scripts", handleGetScripts)
    .put("/v1/scripts/:script_name", handlePutScript)
    .delete("/v1/scripts/:script_name", handleDeleteScript);

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
    if (!Store.getRouter().handles(host)) {
      await next();
      return;
    }

    await Store.getRouter().proxy(ctx);
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  console.log("[server] running at http://0.0.0.0:8000");

  await app.listen({ port: 8000 });
}
