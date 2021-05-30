import { Application, Router, RouterContext } from "../deps.ts";
import { Script } from "./model.ts";
import Store from "./datastore.ts";

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
    context.response.body = {
      success: false,
      errors: [
        { message: "No worker script found" },
      ],
    };

    return;
  }

  await Store.putScript(script);

  context.response.body = {
    success: true,
    errors: [],
    messages: [],
    result: {
      script,
    },
  };
}

export async function runServer(): Promise<void> {
  const router = new Router();
  router
    .get("/", (context) => {
      context.response.body = "Hello world!";
    })
    .put("/v1/workers/scripts/:script_name", handlePutScript);

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
    if (!Store.getRouter().has(host)) {
      await next();
      return;
    }

    await Store.getRouter().proxy(ctx);
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  console.log('[server] running at http://0.0.0.0:8000');

  await app.listen({ port: 8000 });
}
