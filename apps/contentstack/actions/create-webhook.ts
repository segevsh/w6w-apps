import type { ActionDefinition } from "@w6w/types";
import { bool, call, compact, need, str, strList } from "../lib/client.ts";

/**
 * `POST /v3/webhooks` — verified 2026-10-06 against Contentstack's CMA
 * reference and its OpenAPI file (`cma-openapi-3.json`, v3.0.1).
 */
const action: ActionDefinition = {
  key: "create-webhook",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Create a webhook that posts to a URL (no authentication) when the listed events fire.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "targetUrl",
      label: "Target URL",
      type: "string",
      required: true,
      hint: "Receiving URL. Created with authentication type None.",
    },
    {
      key: "channels",
      label: "Events",
      type: "string",
      required: true,
      hint: "Event channels, comma separated, e.g. content_types.entries.create or assets.publish.",
    },
    { key: "disabled", label: "Disabled", type: "boolean" },
    {
      key: "concisePayload",
      label: "Concise payload",
      type: "boolean",
      hint: "Send a concise payload instead of the full one.",
    },
  ],
  output: [
    { key: "notice", type: "string", label: "Vendor message" },
    { key: "webhook", type: "object", label: "The created webhook" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = need("name", str(p.name));
    const targetUrl = need("targetUrl", str(p.targetUrl));
    const channels = need("channels", strList(p.channels));
    const disabled = bool(p.disabled);
    const concisePayload = bool(p.concisePayload);
    ctx.log("info", "Contentstack Create Webhook");
    return await call(ctx, "POST", "/webhooks", {
      body: {
        webhook: compact({
          name,
          destinations: [{ target_url: targetUrl, authentication_type: "None" }],
          channels,
          disabled,
          concise_payload: concisePayload,
        }),
      },
    });
  },
};

export default action;
