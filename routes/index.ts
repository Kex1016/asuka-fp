import { RouterContext } from "@koa/router";

export default {
  type: "get",
  route: "/",
  handler: (ctx: RouterContext) => {
    ctx.body = "hi!";
  },
};
