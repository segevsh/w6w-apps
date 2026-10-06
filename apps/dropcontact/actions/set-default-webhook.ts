import type { ActionDefinition } from "@w6w/types";
import { DropcontactClient, WEBHOOK_PATH } from "../lib/client.ts";

interface Input {
  callbackUrl: string;
}

/** `PUT /v1/enrich/webhook` with `{callback_url}`. One default per account; sets or replaces. */
const setDefaultWebhook: ActionDefinition<Input> = {
  key: "set-default-webhook",
  type: "perform",
  resource: "webhook",
  title: "Set Default Webhook",
  description: "Set or replace the account's single default webhook URL. A request that carries " +
    "its own webhook URL still takes precedence.",
  idempotent: true,
  params: [
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      required: true,
      hint:
        "Where Dropcontact POSTs finished results. Source IPs: 18.202.84.106, 52.48.65.147, 54.74.141.102.",
    },
  ],
  output: [
    { key: "callbackUrl", type: "string", label: "The URL that was set" },
    { key: "response", type: "object", label: "Vendor response" },
  ],

  async execute(input, ctx) {
    const url = String(input.callbackUrl ?? "").trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("callbackUrl must be an http(s) URL");
    const { body } = await new DropcontactClient(ctx).request("PUT", WEBHOOK_PATH, {
      body: { callback_url: url },
    });
    return { callbackUrl: url, response: body };
  },
};

export default setDefaultWebhook;
