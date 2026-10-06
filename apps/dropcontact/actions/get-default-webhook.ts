import type { ActionDefinition } from "@w6w/types";
import { DropcontactClient, WEBHOOK_PATH } from "../lib/client.ts";

/**
 * `GET /v1/enrich/webhook`. The reference documents the route but not its response body, so
 * the vendor's envelope is returned as `response` and `callbackUrl` is read from it only if
 * the vendor names it `callback_url` (the field the PUT takes).
 */
const getDefaultWebhook: ActionDefinition = {
  key: "get-default-webhook",
  type: "read",
  resource: "webhook",
  title: "Get Default Webhook",
  description: "Read the account's default webhook URL, used for every enrichment request that " +
    "does not set its own.",
  params: [],
  output: [
    { key: "callbackUrl", type: "string", label: "Default callback URL, when returned" },
    { key: "response", type: "object", label: "Vendor response" },
  ],

  async execute(_input, ctx) {
    const { body } = await new DropcontactClient(ctx).request("GET", WEBHOOK_PATH);
    return {
      callbackUrl: typeof body.callback_url === "string" ? body.callback_url : undefined,
      response: body,
    };
  },
};

export default getDefaultWebhook;
