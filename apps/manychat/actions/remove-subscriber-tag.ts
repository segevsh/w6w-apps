import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope } from "../lib/client.ts";

interface Input {
  subscriberId: string;
  tagId?: string;
  tagName?: string;
}

/**
 * Untag **one subscriber**. The tag itself is untouched.
 *
 * `POST /fb/subscriber/removeTag` (`{ subscriber_id, tag_id }`) or
 * `POST /fb/subscriber/removeTagByName` (`{ subscriber_id, tag_name }`).
 *
 * ## Not to be confused with `delete-tag`
 *
 * Manychat names these one path segment apart — `/fb/subscriber/removeTag` vs
 * `/fb/page/removeTag` — and the page-level one deletes the tag from the Page and
 * from *every* subscriber, irreversibly. This app deliberately does not mirror
 * that naming: this action is "Remove Subscriber Tag", the other is "Delete Tag
 * (destructive)". If you want to take a tag off one person, you want this one.
 *
 * `idempotent: true` — removing a tag the subscriber does not carry converges on
 * the same state, so a retry is safe.
 */
const removeSubscriberTag: ActionDefinition<Input> = {
  key: "remove-subscriber-tag",
  type: "perform",
  idempotent: true,
  resource: "subscriber",
  title: "Remove Subscriber Tag",
  description: "Take a tag off ONE subscriber (POST /fb/subscriber/removeTag or " +
    "/fb/subscriber/removeTagByName). The tag itself survives — to delete it Page-wide, see " +
    "Delete Tag.",
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    {
      key: "tagId",
      label: "Tag ID",
      type: "string",
      hint: "Supply this or the tag name, not both.",
    },
    { key: "tagName", label: "Tag name", type: "string" },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new ManychatClient(ctx);
    const hasId = !!input.tagId;
    const hasName = !!input.tagName;
    if (hasId === hasName) {
      throw new Error("remove-subscriber-tag needs exactly one of tagId or tagName");
    }

    return hasId
      ? client.post<ManychatEnvelope>("/fb/subscriber/removeTag", {
        subscriber_id: input.subscriberId,
        tag_id: Number(input.tagId),
      })
      : client.post<ManychatEnvelope>("/fb/subscriber/removeTagByName", {
        subscriber_id: input.subscriberId,
        tag_name: input.tagName,
      });
  },
};

export default removeSubscriberTag;
