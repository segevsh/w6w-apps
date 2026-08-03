import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  webhookId: string;
  name?: string;
  postUrl?: string;
  events?: string[];
}

/**
 * `PUT /v1/webhooks/{id}`.
 *
 * Note the schema difference from Create: the update body marks **nothing**
 * required, so this behaves as a partial update and only the properties supplied
 * are sent. That is why every param here is optional while Create requires all
 * three.
 *
 * `idempotent: true` — it sets the subscription to the state you describe, and
 * applying the same state twice changes nothing.
 */
const updateWebhook: ActionDefinition<Input> = {
  key: "update-webhook",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Update a webhook's name, post URL or subscribed events. Only the properties you supply are sent — Flodesk marks none of them required on update.",
  idempotent: true,
  params: [
    { key: "webhookId", label: "Webhook ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "postUrl",
      label: "Post URL",
      type: "string",
      placeholder: "https://example.com/hooks/flodesk",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      hint: "Replaces the current list. Leave unset to keep the existing events.",
      options: [
        { value: "subscriber.created", label: "subscriber.created" },
        { value: "subscriber.added_to_segment", label: "subscriber.added_to_segment" },
        { value: "subscriber.unsubscribed", label: "subscriber.unsubscribed" },
      ],
    },
  ],
  output: [{ key: "webhook", type: "object", label: "The updated webhook" }],

  execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.postUrl !== undefined) body.post_url = input.postUrl;
    if (input.events !== undefined) body.events = input.events;

    if (Object.keys(body).length === 0) {
      throw new Error("supply at least one of `name`, `postUrl` or `events` to update");
    }

    return new FlodeskClient(ctx).request(
      `/webhooks/${FlodeskClient.seg(input.webhookId)}`,
      { method: "PUT", body },
    );
  },
};

export default updateWebhook;
