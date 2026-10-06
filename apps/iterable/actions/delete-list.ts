import type { ActionDefinition } from "@w6w/types";
import { call, int } from "../lib/client.ts";

/**
 * `DELETE /api/lists/{listId}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "delete-list",
  type: "perform",
  resource: "list",
  title: "Delete List",
  description: "Delete a list by id.",
  idempotent: true,
  params: [
    { key: "listId", label: "List ID", type: "number", required: true },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = int("listId", p.listId);
    if (listId === undefined) throw new Error("`listId` is required");
    ctx.log("info", "Iterable Delete List", { listId });
    const out = await call(ctx, "DELETE", `/lists/${encodeURIComponent(String(listId))}`);
    return out;
  },
};

export default action;
