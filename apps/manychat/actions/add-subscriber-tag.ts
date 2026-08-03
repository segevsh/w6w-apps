import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope } from "../lib/client.ts";

interface Input {
  subscriberId: string;
  tagId?: string;
  tagName?: string;
}

/**
 * Tag a subscriber.
 *
 * Two endpoints, one action: `POST /fb/subscriber/addTag` (`{ subscriber_id,
 * tag_id }`) and `POST /fb/subscriber/addTagByName` (`{ subscriber_id,
 * tag_name }`).
 *
 * **Prefer the name.** In Manychat, tagging is what triggers automation, and a
 * workflow almost always knows the tag it means as a word rather than a number.
 * Going by name also removes the `list-tags` round trip that going by id
 * requires. The id path exists for workflows that resolved a tag once and cached
 * it.
 *
 * `idempotent: true`. Adding a tag a subscriber already carries leaves them
 * carrying it once — set semantics, not a counter — so a retry after a timeout
 * cannot double anything. (Note this is about the *tag state*, not about
 * downstream automation: if a Manychat Automation is triggered by "tag added",
 * whether it re-fires on a redundant add is Manychat's behaviour to define, not
 * this app's to promise. See README.md.)
 */
const addSubscriberTag: ActionDefinition<Input> = {
  key: "add-subscriber-tag",
  type: "perform",
  idempotent: true,
  resource: "subscriber",
  title: "Add Subscriber Tag",
  description: "Tag one subscriber, by tag id or tag name (POST /fb/subscriber/addTag or " +
    "/fb/subscriber/addTagByName). Set semantics — safe to retry.",
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    {
      key: "tagId",
      label: "Tag ID",
      type: "string",
      hint: "From List Tags. Supply this or the tag name, not both.",
    },
    {
      key: "tagName",
      label: "Tag name",
      type: "string",
      hint: "Usually the better choice — no lookup needed.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const client = new ManychatClient(ctx);
    const hasId = !!input.tagId;
    const hasName = !!input.tagName;
    if (hasId === hasName) {
      throw new Error("add-subscriber-tag needs exactly one of tagId or tagName");
    }

    return hasId
      ? client.post<ManychatEnvelope>("/fb/subscriber/addTag", {
        subscriber_id: input.subscriberId,
        tag_id: Number(input.tagId),
      })
      : client.post<ManychatEnvelope>("/fb/subscriber/addTagByName", {
        subscriber_id: input.subscriberId,
        tag_name: input.tagName,
      });
  },
};

export default addSubscriberTag;
