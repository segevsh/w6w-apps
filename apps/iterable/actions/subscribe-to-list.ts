import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, int, jsonArray } from "../lib/client.ts";

/**
 * `POST /api/lists/subscribe` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "subscribe-to-list",
  type: "perform",
  resource: "list",
  title: "Subscribe Users to List",
  description: "Add users to a static list.",
  idempotent: true,
  params: [
    { key: "listId", label: "List ID", type: "number", required: true },
    {
      key: "subscribers",
      label: "Subscribers",
      type: "json",
      required: true,
      hint: 'JSON array of {"email"|"userId", "dataFields"} objects.',
    },
    {
      key: "updateExistingUsersOnly",
      label: "Update Existing Users Only",
      type: "boolean",
      hint: "Skip users that do not exist yet (userId-based and hybrid projects).",
    },
  ],
  output: [
    { key: "successCount", type: "number", label: "Users added" },
    { key: "failCount", type: "number", label: "Users that failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = int("listId", p.listId);
    const subscribers = jsonArray("subscribers", p.subscribers);
    const updateExistingUsersOnly = bool(p.updateExistingUsersOnly);
    if (listId === undefined) throw new Error("`listId` is required");
    if (subscribers === undefined) throw new Error("`subscribers` is required");
    ctx.log("info", "Iterable Subscribe Users to List", { listId });
    const out = await call(ctx, "POST", "/lists/subscribe", {
      body: compact({
        "listId": listId,
        "subscribers": subscribers,
        "updateExistingUsersOnly": updateExistingUsersOnly,
      }),
    });
    return out;
  },
};

export default action;
