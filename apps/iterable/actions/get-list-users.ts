import type { ActionDefinition } from "@w6w/types";
import { bool, call, int } from "../lib/client.ts";

/**
 * `GET /api/lists/getUsers` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-list-users",
  type: "read",
  resource: "list",
  title: "Get List Members",
  description: "Members of a list, one per line. Rate limit: 5 requests/minute per project.",
  params: [
    { key: "listId", label: "List ID", type: "number", required: true },
    {
      key: "preferUserId",
      label: "Prefer User ID",
      type: "boolean",
      hint: "Return userId instead of email in hybrid projects.",
    },
  ],
  output: [
    { key: "users", type: "array", label: "Member identifiers" },
    { key: "text", type: "string", label: "Raw response" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = int("listId", p.listId);
    const preferUserId = bool(p.preferUserId);
    if (listId === undefined) throw new Error("`listId` is required");
    ctx.log("info", "Iterable Get List Members", { listId });
    const out = await call(ctx, "GET", "/lists/getUsers", {
      query: { "listId": listId, "preferUserId": preferUserId },
      text: true,
    });
    const text = String(out.text ?? "");
    return { users: text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean), text };
  },
};

export default action;
