import Koa from "koa";
import { koaBody } from "koa-body";
import Router from "@koa/router";
import serve from "koa-static";
import fs from "fs";
import path from "path";
import logging from "./logging.js";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

logging.log(logging.Severity.DEBUG, "[API] Initializing API");
const app = new Koa();
app.use(koaBody());

// Test for ../public
logging.log(logging.Severity.DEBUG, "[API] Testing for ../public");
if (!fs.existsSync(path.join(__dirname, "../public"))) {
  logging.log(logging.Severity.DEBUG, "[API] Creating ../public");
  fs.mkdirSync(path.join(__dirname, "../public"));
}

app.use(serve(path.join(__dirname, "../public")));

// Add routes
logging.log(logging.Severity.DEBUG, "[API] Adding routes");
export const router = new Router();

// Execute code in routes folder
const files = fs.readdirSync(path.join(__dirname, "../routes"));

for (const file of files) {
  const route = "@/routes/" + file.replace(".ts", ".js");
  logging.log(logging.Severity.DEBUG, `[API] Loading route ${route}`);

  const routeModule = await import(route);
  if (routeModule.default) {
    const type = routeModule.default.type;
    const route = routeModule.default.route;
    const handler = routeModule.default.handler;

    if (type === "get") {
      router.get(route, handler);
    }

    if (type === "post") {
      router.post(route, handler);
    }

    if (type === "put") {
      router.put(route, handler);
    }

    if (type === "delete") {
      router.delete(route, handler);
    }

    if (type === "patch") {
      router.patch(route, handler);
    }

    if (type === "head") {
      router.head(route, handler);
    }

    if (type === "options") {
      router.options(route, handler);
    }
  }

  logging.log(logging.Severity.DEBUG, `[API] Loaded route ${route}`);
}

app.use(router.routes());

export default app;
