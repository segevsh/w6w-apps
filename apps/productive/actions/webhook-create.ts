import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, omitKeys, ProductiveClient, toObject } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Create a webhook that calls a URL when an event happens (`POST /webhooks`). The answer omits the signature token and custom headers.
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  name: string;
  targetUrl: string;
  eventId: number;
  typeId?: string | number;
  customHeaders?: unknown;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Create a webhook that calls a URL when an event happens (`POST /webhooks`). The answer omits the signature token and custom headers.",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    {
      "key": "targetUrl",
      "label": "Target URL",
      "type": "string",
      "required": true,
      "hint": "The URL Productive calls.",
    },
    {
      "key": "eventId",
      "label": "Event ID",
      "type": "number",
      "required": true,
      "hint":
        "Vendor event number, 1 to 35. The reference lists the numbers but not which event each means, so confirm one in Productive before relying on it.",
    },
    {
      "key": "typeId",
      "label": "Type",
      "type": "select",
      "hint": "1 = webhook, 2 = Zapier.",
      "options": [{ "value": 1, "label": "Webhook" }, { "value": 2, "label": "Zapier" }],
    },
    {
      "key": "customHeaders",
      "label": "Custom headers",
      "type": "json",
      "hint":
        'JSON object of headers sent with each call, e.g. `{"X-Source": "w6w"}`. Stored by Productive; not returned by this app.',
    },
  ],
  output: resourceOutput("Webhook"),

  async execute(input, ctx) {
    const attrs = {
      "name": input.name,
      "target_url": input.targetUrl,
      "event_id": input.eventId,
      "type_id": input.typeId,
      "custom_headers": toObject(input.customHeaders, "custom headers"),
    };
    const out = await new ProductiveClient(ctx).one(`/webhooks`, {
      method: "POST",
      body: jsonApiBody("webhooks", attrs),
    });
    return omitKeys(out, ["signature_token", "custom_headers"]);
  },
};

export default webhookCreate;
