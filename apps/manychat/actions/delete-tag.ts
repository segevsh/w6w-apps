import type { ActionDefinition } from "@w6w/types";
import { ManychatClient, type ManychatEnvelope } from "../lib/client.ts";

interface Input {
  tagId?: string;
  tagName?: string;
}

/**
 * Delete a tag from the Page **and from every subscriber carrying it**.
 *
 * The spec's own description, verbatim on both endpoints:
 *
 *     "Removes specified tag from the page and the page's subscribers.
 *      This action can not be undone."
 *
 * This is not "untag one person" — that is `remove-subscriber-tag`. This destroys
 * the tag itself and, with it, every piece of segmentation built on it. The two
 * actions are named far apart on purpose, because in Manychat's own API they are
 * one word apart (`page/removeTag` vs `subscriber/removeTag`) and picking the
 * wrong one is unrecoverable.
 *
 * ## Two endpoints, one action
 *
 * Manychat publishes `removeTag` (`{ tag_id }`) and `removeTagByName`
 * (`{ tag_name }`) as separate operations with identical semantics. They are one
 * action here: a workflow usually has whichever identifier it happens to hold,
 * and forcing a `list-tags` round trip to convert one into the other is friction
 * with no safety benefit. Exactly one of the two must be supplied, and supplying
 * both is rejected here rather than resolved by precedence — a caller who passes
 * a mismatched pair has a bug, and silently honouring one of them would delete
 * the wrong tag irreversibly.
 *
 * `idempotent: false`: a second call against an already-deleted tag has nothing
 * to delete, and the spec does not promise it succeeds.
 */
const deleteTag: ActionDefinition<Input> = {
  key: "delete-tag",
  type: "perform",
  idempotent: false,
  resource: "tag",
  title: "Delete Tag (destructive)",
  description:
    "Delete a tag from the Page AND strip it from every subscriber (POST /fb/page/removeTag or " +
    "/fb/page/removeTagByName). Manychat documents this as irreversible. To untag one person, " +
    "use Remove Subscriber Tag instead.",
  params: [
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
      hint: "Supply this or the tag ID, not both.",
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
      throw new Error(
        "delete-tag needs exactly one of tagId or tagName — deleting a tag cannot be undone, " +
          "so an ambiguous target is refused rather than resolved.",
      );
    }

    return hasId
      ? client.post<ManychatEnvelope>("/fb/page/removeTag", { tag_id: Number(input.tagId) })
      : client.post<ManychatEnvelope>("/fb/page/removeTagByName", { tag_name: input.tagName });
  },
};

export default deleteTag;
