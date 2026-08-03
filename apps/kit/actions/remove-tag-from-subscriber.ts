import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  tagId: number;
  subscriberId: number;
}

/**
 * The by-id form, `DELETE /v4/tags/{tag_id}/subscribers/{id}`. Kit also
 * publishes an email-address variant on `DELETE /v4/tags/{tag_id}/subscribers`,
 * but its OpenAPI `parameters` array omits the `email_address` the prose says
 * to send as a query parameter — so the id form is the one specified
 * unambiguously, and the one we call. Pair it with List Subscribers
 * (`emailAddress`) when only the email is known.
 *
 * Kit returns `204 No Content`, so this action resolves to `undefined`; the
 * absence of a thrown error is the success signal.
 */
const removeTagFromSubscriber: ActionDefinition<Input> = {
  key: "remove-tag-from-subscriber",
  type: "perform",
  resource: "tag",
  title: "Remove Tag From Subscriber",
  description:
    "Remove a tag from a subscriber by subscriber id. The subscriber stays in the account and keeps their other tags. Returns no content.",
  idempotent: true,
  params: [
    { key: "tagId", label: "Tag ID", type: "number", required: true },
    { key: "subscriberId", label: "Subscriber ID", type: "number", required: true },
  ],
  output: [],

  execute(input, ctx) {
    return new KitClient(ctx).request(
      `/tags/${input.tagId}/subscribers/${input.subscriberId}`,
      { method: "DELETE" },
    );
  },
};

export default removeTagFromSubscriber;
