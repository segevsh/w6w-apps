import type { ActionDefinition } from "@w6w/types";
import { call, compact, str } from "../lib/client.ts";

/**
 * `POST /api/lists` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "create-list",
  type: "perform",
  resource: "list",
  title: "Create Static List",
  description: "Create a static list. Returns its `listId`.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "string" },
  ],
  output: [
    { key: "listId", type: "number", label: "New list id" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = str(p.name);
    const description = str(p.description);
    if (name === undefined) throw new Error("`name` is required");
    ctx.log("info", "Iterable Create Static List", { name });
    const out = await call(ctx, "POST", "/lists", {
      body: compact({ "name": name, "description": description }),
    });
    return out;
  },
};

export default action;
