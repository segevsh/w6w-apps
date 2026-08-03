import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  name: string;
  postUrl: string;
  events: string[];
}

/**
 * `POST /v1/webhooks`. All three properties — `name`, `post_url`, `events` — are
 * required by Flodesk's schema.
 *
 * The `events` array is typed as a bare `string[]` in Flodesk's schema with no
 * enum attached, but the vendor publishes exactly three webhook events under
 * `x-webhooks`, and those are offered as the options here:
 *
 *   - `subscriber.created`           — a subscriber is created
 *   - `subscriber.added_to_segment`  — a subscriber is added to a segment
 *   - `subscriber.unsubscribed`      — a subscriber unsubscribes from all mailings
 *
 * The select is left open rather than validated against that list, because the
 * schema itself does not constrain it and Flodesk may add events without
 * reissuing the document. Sending an unknown event name is Flodesk's to reject.
 *
 * Note there is no `event.updated` or `subscriber.deleted`, and no signing
 * secret: Flodesk's webhook schema exposes no signature header or secret field,
 * so a receiver cannot verify authenticity beyond keeping the post URL secret.
 * Choose an unguessable path.
 *
 * `idempotent: false` — answers `201`, no uniqueness rule on `post_url`, so a
 * replay creates a second subscription and the endpoint then receives every
 * event twice.
 */
const createWebhook: ActionDefinition<Input> = {
  key: "create-webhook",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Subscribe a URL to Flodesk subscriber events. Not idempotent — a repeated call creates a second subscription and your endpoint will receive each event twice.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "A label for this subscription, shown in Flodesk.",
    },
    {
      key: "postUrl",
      label: "Post URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/hooks/flodesk",
      hint:
        "Where Flodesk POSTs each event. Flodesk publishes no signature header, so treat this URL as a secret and make its path unguessable.",
    },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      required: true,
      hint: "Flodesk publishes these three events. Its schema does not restrict the list.",
      options: [
        { value: "subscriber.created", label: "subscriber.created" },
        { value: "subscriber.added_to_segment", label: "subscriber.added_to_segment" },
        { value: "subscriber.unsubscribed", label: "subscriber.unsubscribed" },
      ],
    },
  ],
  output: [{ key: "webhook", type: "object", label: "The created webhook" }],

  execute(input, ctx) {
    if (!Array.isArray(input.events) || input.events.length === 0) {
      throw new Error("`events` must list at least one event");
    }
    return new FlodeskClient(ctx).request("/webhooks", {
      method: "POST",
      body: { name: input.name, post_url: input.postUrl, events: input.events },
    });
  },
};

export default createWebhook;
