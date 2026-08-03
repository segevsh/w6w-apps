import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";
import { postOutput } from "../lib/params.ts";

/**
 * Like a post — `POST /post_actions.json` with `post_action_type_id: 2`.
 *
 * ## Why the type id is a constant and not a parameter
 *
 * The endpoint is generic ("Like a post and other actions") and takes an
 * arbitrary `post_action_type_id`. The reference documents exactly one value for
 * it: "The ID of the post action type (e.g., 2 for like)". The other ids are
 * flag types, and their numbering is not published in the API reference at all.
 *
 * Exposing the raw integer would hand a workflow author a field where every
 * value but one is an undocumented guess, and where a wrong guess silently files
 * a moderation flag against a community member instead of liking their post.
 * That is a bad trade, so this action does the one documented thing and says so
 * in its name. Flagging is listed in the README as deliberately not built.
 *
 * `flag_topic` is likewise not offered — it only makes sense paired with a flag
 * type id, which this action does not send.
 */
interface Input {
  postId: number;
}

/** Discourse's `PostActionType` id for "like". The only value the reference names. */
export const LIKE_POST_ACTION_TYPE_ID = 2;

const postLike: ActionDefinition<Input> = {
  key: "post-like",
  type: "perform",
  resource: "post",
  title: "Like Post",
  description: "Add a like to a post, as the connection's API user.",
  // Discourse rejects a second like from the same user on the same post, so a
  // retry after a successful call is an error rather than a no-op.
  idempotent: false,
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      required: true,
      hint: "The global post id.",
      validation: { integer: true },
    },
  ],
  output: postOutput,

  execute(input, ctx) {
    return new DiscourseClient(ctx).request("/post_actions.json", {
      method: "POST",
      body: {
        id: input.postId,
        post_action_type_id: LIKE_POST_ACTION_TYPE_ID,
      },
    });
  },
};

export default postLike;
