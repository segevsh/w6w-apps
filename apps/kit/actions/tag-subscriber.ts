import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  tagId: number;
  emailAddress: string;
}

/**
 * Kit exposes two shapes for this: `POST /v4/tags/{tag_id}/subscribers/{id}`
 * by subscriber id, and `POST /v4/tags/{tag_id}/subscribers` with an
 * `email_address` body. We ship the email form — a workflow almost always has
 * the email in hand and would otherwise need a lookup call first.
 *
 * Kit is explicit that the subscriber must already exist; this endpoint does
 * NOT create one, and returns 404 for an unknown address.
 */
const tagSubscriber: ActionDefinition<Input> = {
  key: "tag-subscriber",
  type: "perform",
  resource: "tag",
  title: "Tag Subscriber",
  description:
    "Apply a tag to an existing subscriber by email address. Returns 200 when the subscriber already carries the tag, so re-tagging is safe. The subscriber must already exist.",
  idempotent: true,
  params: [
    { key: "tagId", label: "Tag ID", type: "number", required: true },
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      required: true,
      placeholder: "name@email.com",
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber, with `tagged_at`" }],

  execute(input, ctx) {
    return new KitClient(ctx).request(`/tags/${input.tagId}/subscribers`, {
      method: "POST",
      body: { email_address: input.emailAddress },
    });
  },
};

export default tagSubscriber;
