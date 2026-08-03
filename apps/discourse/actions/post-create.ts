import type { ActionDefinition } from "@w6w/types";
import { compact, DiscourseClient, unset } from "../lib/client.ts";
import { postOutput, rawParam } from "../lib/params.ts";

/**
 * Reply to a topic — `POST /posts.json` with `topic_id` set.
 *
 * Same endpoint as `topic-create` and `message-create`; the presence of
 * `topic_id` is what makes it a reply. The reference is explicit about the
 * split: `topic_id` is "Required if creating a new post", while `title` is
 * "Required if creating a new topic or new private message".
 *
 * `reply_to_post_number` threads the reply under a specific post. Note it is a
 * post *number* — the 1-based position within the topic, which is what
 * Discourse shows in the UI and in permalinks — not the global post id. Getting
 * those two confused silently threads the reply under the wrong post, or under
 * nothing, so the two ids are labelled apart.
 */
interface Input {
  topicId: number;
  raw: string;
  replyToPostNumber?: number;
  createdAt?: string;
}

const postCreate: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description: "Reply to an existing topic.",
  // A repeat call adds a second reply; Discourse has no upsert here.
  idempotent: false,
  params: [
    {
      key: "topicId",
      label: "Topic ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    rawParam,
    {
      key: "replyToPostNumber",
      label: "Reply to post number",
      type: "number",
      advanced: true,
      hint: "The post's 1-based position in the topic (what the permalink shows), NOT its global " +
        "post id. Omit to reply to the topic as a whole.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "datetime",
      advanced: true,
      hint: "Backdate the post. Requires a staff key.",
    },
  ],
  output: postOutput,

  execute(input, ctx) {
    return new DiscourseClient(ctx).request("/posts.json", {
      method: "POST",
      body: compact({
        topic_id: input.topicId,
        raw: input.raw,
        reply_to_post_number: input.replyToPostNumber,
        created_at: unset(input.createdAt),
      }),
    });
  },
};

export default postCreate;
