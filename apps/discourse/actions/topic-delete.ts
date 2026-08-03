import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";

/**
 * `DELETE /t/{id}.json`.
 *
 * This is a **soft delete** for anyone below admin: Discourse marks the topic
 * deleted and hides it, and staff can still see and restore it. Only a full
 * admin's delete removes the record, and even then the forum's
 * `delete_removed_posts_after` setting governs the timing. The action is named
 * "Delete" rather than "Trash" because that is the endpoint's own summary
 * ("Remove a topic"), but the hint says what actually happens.
 *
 * The endpoint answers 200 with an empty body, so there is nothing to return
 * beyond the fact that it succeeded — a non-2xx throws in `lib/client.ts`.
 */
interface Input {
  topicId: number | string;
}

const topicDelete: ActionDefinition<Input> = {
  key: "topic-delete",
  type: "perform",
  resource: "topic",
  title: "Delete Topic",
  description: "Remove a topic. Staff can still restore it unless the forum purges deletions.",
  // Deleting an already-deleted topic converges on the same state.
  idempotent: true,
  params: [
    {
      key: "topicId",
      label: "Topic ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "Soft delete — staff retain a restorable copy.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "topic_id", type: "number", label: "Topic ID" },
  ],

  async execute(input, ctx) {
    const topicId = String(input.topicId);
    await new DiscourseClient(ctx).request(`/t/${encodeURIComponent(topicId)}.json`, {
      method: "DELETE",
    });
    return { deleted: true, topic_id: Number(topicId) };
  },
};

export default topicDelete;
