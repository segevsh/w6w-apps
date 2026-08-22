import type { ActionDefinition } from "@w6w/types";
import { PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM } from "../lib/params.ts";

/**
 * `POST /item/webhook/update` — point an Item's notifications somewhere else.
 *
 * Webhooks are how Plaid says something happened without being polled — most
 * importantly `SYNC_UPDATES_AVAILABLE`, which is the signal that
 * `transaction-sync` has something new to return, and `ITEM_ERROR`, which is
 * how a workflow learns a connection broke without discovering it on the next
 * failed read.
 *
 * A workflow that polls sync on a schedule instead is doing more work for a
 * worse answer: Plaid refreshes an Item a few times a day, so most polls return
 * nothing while still costing a call.
 *
 * Changing the URL takes effect immediately and applies to this Item only —
 * every Item carries its own, set when it was created.
 */
const action: ActionDefinition = {
  key: "webhook-update",
  type: "perform",
  resource: "item",
  title: "Update an Item's webhook",
  description:
    "Point one Item's notifications at a URL. The alternative to polling — Plaid refreshes a few " +
    "times a day, so most polls cost a call and return nothing.",
  idempotent: true,
  params: [
    ACCESS_TOKEN_PARAM,
    {
      key: "webhook",
      label: "Webhook URL",
      type: "string",
      required: true,
      default: "",
      hint: "Where Plaid posts this Item's events. Must be HTTPS and publicly reachable.",
    },
  ],
  output: [
    { key: "item", type: "object", label: "Item" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");
    const webhook = String(p.webhook ?? "").trim();
    if (!webhook) throw new Error("`webhook` is required");
    if (!webhook.startsWith("https://")) {
      throw new Error("Plaid requires an HTTPS webhook URL");
    }

    return await new PlaidClient(ctx).request("/item/webhook/update", {
      access_token: accessToken,
      webhook,
    });
  },
};

export default action;
