import { coerce, define } from "../lib/actions.ts";
import { call } from "../lib/client.ts";

/**
 * `POST /webhooks` (scope `webhooks.write`), HTTP type. `configuration` is the
 * list of subscribed events — each `{id, is_enabled}`, the ids coming from
 * `GET /webhooks/events` — so this action takes the ids as a plain list.
 * Slack-type webhooks and the `sign_key` field are not covered.
 */
export default define(
  {
    key: "webhook-create",
    type: "perform",
    title: "Create Webhook",
    description:
      "Subscribe an HTTP endpoint to Sellsy events. Event IDs come from List Webhook Events. Needs the `webhooks.write` scope.",
  },
  [
    { key: "endpoint", label: "Endpoint URL", required: true, hint: "Sellsy POSTs events here." },
    { key: "name", label: "Name" },
    {
      key: "events",
      label: "Events",
      required: true,
      hint: "Comma-separated event IDs, e.g. `task.created,opportunity.created`.",
    },
    { key: "object_in_payload", label: "Include the full object in the payload", as: "bool" },
    {
      key: "json_content_type",
      label: "Send as application/json",
      as: "bool",
      hint: "Off, Sellsy sends application/x-www-form-urlencoded.",
    },
  ],
  [{ key: "webhook", type: "json", label: "The created webhook" }],
  async (input, ctx) => {
    const events = coerce("events", input.events, "strList") as string[] | undefined;
    if (!events?.length) throw new Error("events must list at least one event ID");
    const body: Record<string, unknown> = {
      type: "http",
      is_enabled: true,
      endpoint: input.endpoint,
      configuration: events.map((id) => ({ id, is_enabled: true })),
    };
    if (input.name) body.name = input.name;
    const objectInPayload = coerce("object_in_payload", input.object_in_payload, "bool");
    if (objectInPayload !== undefined) body.object_in_payload = objectInPayload;
    const json = coerce("json_content_type", input.json_content_type, "bool");
    if (json !== undefined) body.json_content_type = json;
    return { webhook: await call(ctx, "/webhooks", { method: "POST", body }) };
  },
  false,
);
