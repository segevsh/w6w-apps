import type { ActionDefinition } from "@w6w/types";
import { call, int } from "../lib/client.ts";

/**
 * `GET /api/lists/{listId}/size` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-list-size",
  type: "read",
  resource: "list",
  title: "Get List Size",
  description: "Number of users in a list. Rate limit: 5 requests/minute per project.",
  params: [
    { key: "listId", label: "List ID", type: "number", required: true },
  ],
  output: [
    { key: "size", type: "number", label: "Member count (null if the response was not numeric)" },
    { key: "text", type: "string", label: "Raw response" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = int("listId", p.listId);
    if (listId === undefined) throw new Error("`listId` is required");
    ctx.log("info", "Iterable Get List Size", { listId });
    const out = await call(ctx, "GET", `/lists/${encodeURIComponent(String(listId))}/size`, {
      text: true,
    });
    const text = String(out.text ?? "").trim();
    return { size: text !== "" && Number.isFinite(Number(text)) ? Number(text) : null, text };
  },
};

export default action;
