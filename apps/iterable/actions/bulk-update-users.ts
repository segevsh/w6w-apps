import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, jsonArray } from "../lib/client.ts";

/**
 * `POST /api/users/bulkUpdate` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "bulk-update-users",
  type: "perform",
  resource: "user",
  title: "Bulk Update Users",
  description:
    "Update up to many user profiles in one call. Overwrites the profile fields you send; top-level fields you omit are untouched.",
  idempotent: true,
  params: [
    {
      key: "users",
      label: "Users",
      type: "json",
      required: true,
      hint: 'JSON array of {"email"|"userId", "dataFields"} objects.',
    },
    {
      key: "createNewFields",
      label: "Create New Fields",
      type: "boolean",
      hint: "Create unknown data fields automatically.",
    },
  ],
  output: [
    { key: "successCount", type: "number", label: "Users updated" },
    { key: "failCount", type: "number", label: "Users that failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const users = jsonArray("users", p.users);
    const createNewFields = bool(p.createNewFields);
    if (users === undefined) throw new Error("`users` is required");
    ctx.log("info", "Iterable Bulk Update Users");
    const out = await call(ctx, "POST", "/users/bulkUpdate", {
      body: compact({ "users": users, "createNewFields": createNewFields }),
    });
    return out;
  },
};

export default action;
