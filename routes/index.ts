import { RouterContext } from "@koa/router";

export default {
  type: "get",
  route: "/",
  handler: async (ctx: RouterContext) => {
    ctx.body = "hi!";
  },
};
