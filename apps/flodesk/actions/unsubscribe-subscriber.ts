import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  idOrEmail: string;
}

/**
 * `POST /v1/subscribers/{id_or_email}/unsubscribe` — Flodesk's summary is
 * "Unsubscribe from all lists". It is global, not per-segment: to take someone
 * out of one segment while leaving them subscribed, use Remove Subscriber from
 * Segments instead.
 *
 * `idempotent: true` — it drives the subscriber to the `unsubscribed` status,
 * and a second call leaves them there. The action is not reversible through the
 * API, though: Flodesk publishes no re-subscribe endpoint, and re-consent has to
 * come from the subscriber.
 */
const unsubscribeSubscriber: ActionDefinition<Input> = {
  key: "unsubscribe-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Unsubscribe Subscriber",
  description:
    "Unsubscribe a subscriber from ALL mailings, setting their status to `unsubscribed`. Not reversible through the API — Flodesk publishes no re-subscribe endpoint.",
  idempotent: true,
  params: [
    {
      key: "idOrEmail",
      label: "Subscriber ID or email",
      type: "string",
      required: true,
      placeholder: "name@email.com",
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber, now `unsubscribed`" }],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request(
      `/subscribers/${FlodeskClient.seg(input.idOrEmail)}/unsubscribe`,
      { method: "POST" },
    );
  },
};

export default unsubscribeSubscriber;
