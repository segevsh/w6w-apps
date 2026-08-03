import type { ActionDefinition } from "@w6w/types";
import { CircleClient, compact, unset } from "../lib/client.ts";
import { commentOutput, skipNotificationsParam } from "../lib/params.ts";

/**
 * `POST /comments` — comment on a post, or reply to a comment.
 *
 * ## A comment body is a plain STRING, and a post body is not
 *
 * This is the API's sharpest inconsistency and the reason this action looks
 * nothing like `post-create`. The create schema types `body` as
 * `{"type": "string"}` — no TipTap document, no `tiptap_body`, no wrapper. Yet
 * the `comment` schema returns `body` as an *object*. So a comment is written
 * as text and read back as a structure.
 *
 * `lib/tiptap.ts` is therefore deliberately not used here. Wrapping the text in
 * a document "for consistency" would send an object where the schema declares a
 * string, which is a 422 dressed up as tidiness.
 *
 * ## There is no author override
 *
 * `post-create` takes `user_email` and authors the post as that member. The
 * comment schema has no equivalent — its six properties are `body`, `post_id`,
 * `parent_comment_id`, `created_at`, `updated_at` and `skip_notifications`. So
 * every comment written through this action is authored by the member who owns
 * the API token, and that cannot be changed from here. Worth knowing before
 * wiring up an auto-responder: the replies will all carry an admin's name.
 *
 * ## Replies
 *
 * `parent_comment_id` turns the comment into a reply. `post_id` is still
 * required alongside it — the parent does not imply the post — which is exactly
 * the kind of thing that produces a 422 on the second call rather than the
 * first.
 *
 * Not idempotent: every call creates a comment, and a repeat creates a second
 * one saying the same thing.
 */
interface Input {
  postId: number;
  body: string;
  parentCommentId?: number;
  skipNotifications?: boolean;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description:
    "Comment on a post, or reply to another comment. Authored by the token's owner — this " +
    "endpoint has no author override.",
  idempotent: false,
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      required: true,
      hint: "Required even when replying — the parent comment does not imply the post.",
      validation: { integer: true },
    },
    {
      key: "body",
      label: "Comment",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "Plain text. Unlike a post body, this endpoint takes a string rather than a TipTap " +
        "document — Circle returns it as a structure but accepts it as text.",
    },
    {
      key: "parentCommentId",
      label: "Reply to comment ID",
      type: "number",
      hint: "Makes this a reply. `comment-list` returns comment ids.",
      validation: { integer: true },
    },
    skipNotificationsParam,
  ],
  output: commentOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/comments", {
      method: "POST",
      body: compact({
        post_id: input.postId,
        body: unset(input.body),
        parent_comment_id: input.parentCommentId,
        skip_notifications: input.skipNotifications ? true : undefined,
      }),
    });
  },
};

export default commentCreate;
