import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput } from "../lib/params.ts";

/**
 * `DELETE /posts/{id}` — remove a post.
 *
 * The post's comments go with it. Circle documents no restore route and no
 * soft-delete for basic posts, so this is final; the alternative for "stop the
 * conversation but keep the record" is `post-update` with
 * `is_comments_closed: true`, which is why that flag is on the update rather
 * than being folded into a status here.
 *
 * The endpoint declares only a `200` response — there is no documented 404 for
 * a post that is already gone — so a replay is not expected to raise. It is
 * marked idempotent on that basis, and because "the post does not exist" is the
 * state a retry is trying to reach.
 */
interface Input {
  postId: number;
}

const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description: "Permanently delete a post and its comments. Circle publishes no restore route.",
  idempotent: true,
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      required: true,
      hint: "To silence a post without destroying it, use `post-update` and close its comments.",
      validation: { integer: true },
    },
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request(
      `/posts/${encodeURIComponent(String(input.postId))}`,
      { method: "DELETE" },
    );
  },
};

export default postDelete;
