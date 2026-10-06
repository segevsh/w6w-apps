import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/**
 * `GET /api/users/getFields` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-user-fields",
  type: "read",
  resource: "user",
  title: "List User Fields",
  description: "List every user data field in the project with its type.",
  params: [],
  output: [
    { key: "fields", type: "object", label: "Map of field name to type" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "Iterable List User Fields");
    const out = await call(ctx, "GET", "/users/getFields");
    return out;
  },
};

export default action;
