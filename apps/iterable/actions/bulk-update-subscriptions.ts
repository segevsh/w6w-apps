import type { ActionDefinition } from "@w6w/types";
import { call, compact, jsonArray } from "../lib/client.ts";

/**
 * `POST /api/users/bulkUpdateSubscriptions` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "bulk-update-subscriptions",
  type: "perform",
  resource: "subscription",
  title: "Bulk Update Subscriptions",
  description: "Update subscriptions for many users. Overwrites each field supplied per user.",
  idempotent: true,
  params: [
    {
      key: "updateSubscriptionsRequests",
      label: "Subscription Updates",
      type: "json",
      required: true,
      hint: 'JSON array of update-subscriptions objects ({"email"|"userId", "emailListIds", ...}).',
    },
  ],
  output: [
    { key: "successCount", type: "number", label: "Users updated" },
    { key: "failCount", type: "number", label: "Users that failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const updateSubscriptionsRequests = jsonArray(
      "updateSubscriptionsRequests",
      p.updateSubscriptionsRequests,
    );
    if (updateSubscriptionsRequests === undefined) {
      throw new Error("`updateSubscriptionsRequests` is required");
    }
    ctx.log("info", "Iterable Bulk Update Subscriptions");
    const out = await call(ctx, "POST", "/users/bulkUpdateSubscriptions", {
      body: compact({ "updateSubscriptionsRequests": updateSubscriptionsRequests }),
    });
    return out;
  },
};

export default action;
