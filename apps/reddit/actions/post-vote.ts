import type { ActionDefinition } from "@w6w/types";
import { fullname, RedditClient } from "../lib/client.ts";

interface Input {
  postId: string;
  direction: "up" | "down" | "unvote";
}

const DIRECTION_TO_DIR: Record<Input["direction"], number> = { up: 1, down: -1, unvote: 0 };

/**
 * `POST /api/vote` (scope: vote) —
 * github.com/reddit-archive/reddit/wiki/API#POST_api_vote. `dir` is `1`
 * (upvote), `-1` (downvote), or `0` (remove the acting user's vote). The
 * endpoint returns an empty `{}` body on success — there's no post/comment
 * data to hand back, only confirmation.
 *
 * Retrying the same call is safe: Reddit's vote state is "this user's vote
 * on this thing is X", not an append-only log, so re-sending the same
 * direction is a no-op rather than a double vote.
 */
const postVote: ActionDefinition<Input, { ok: true }> = {
  key: "post-vote",
  type: "perform",
  resource: "post",
  title: "Vote on Post",
  description: "Upvote, downvote, or remove the acting user's vote on a post.",
  idempotent: true,
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "string",
      required: true,
      placeholder: "l0me7x",
      hint: "The id from the post URL, with or without the t3_ prefix.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      required: true,
      options: [
        { value: "up", label: "Upvote" },
        { value: "down", label: "Downvote" },
        { value: "unvote", label: "Remove vote" },
      ],
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    await new RedditClient(ctx).request("/api/vote", {
      method: "POST",
      form: { id: fullname("t3", input.postId), dir: DIRECTION_TO_DIR[input.direction] },
    });
    return { ok: true };
  },
};

export default postVote;
