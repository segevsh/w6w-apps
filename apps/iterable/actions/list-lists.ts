import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

/**
 * `GET /api/lists` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "list-lists",
  type: "read",
  resource: "list",
  title: "List Lists",
  description: "All lists in the project.",
  params: [],
  output: [
    { key: "lists", type: "array", label: "Lists (id, name, createdAt, listType)" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "Iterable List Lists");
    const out = await call(ctx, "GET", "/lists");
    return out;
  },
};

export default action;
