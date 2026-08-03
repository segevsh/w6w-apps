import type { ActionDefinition } from "@w6w/types";
import { CircleClient, compact, idList, unset } from "../lib/client.ts";
import { bodyJsonParam, idListParam, postOutput, skipNotificationsParam } from "../lib/params.ts";
import { resolveBody } from "../lib/tiptap.ts";

/**
 * `PUT /posts/{id}` — edit a post.
 *
 * ## The body is optional here, unlike on create
 *
 * `POST /posts` requires `space_id` and `name`; the update schema requires
 * nothing at all, so a call that only pins a post or closes its comments should
 * not have to resend the body. `resolveBody` therefore runs **only when one of
 * the two body params is supplied** — calling it unconditionally would reject
 * every body-less edit with "a body is required", which is exactly the wrong
 * behaviour for a partial update.
 *
 * When a body *is* supplied it replaces the whole document. To edit rather than
 * replace, read `tiptap_body` off `post-get`, modify it, and pass it back
 * through the JSON param — which is the round trip that param exists for.
 *
 * ## `space_id` is not on this schema — a post cannot be moved
 *
 * The update body accepts eighteen properties and `space_id` is not among them.
 * Moving a post between spaces is not something v2 exposes, and the `spaceId`
 * param here is deliberately absent rather than silently ignored.
 *
 * ## The three comment/like flags are tri-state in practice
 *
 * `is_comments_enabled`, `is_comments_closed` and `is_liking_enabled` are real
 * booleans where `false` is a meaningful value, so `compact` keeps it and only
 * `undefined` means "leave alone". That is why they are plain booleans rather
 * than the `x ? true : undefined` idiom used for the write-once flags.
 *
 * Idempotent: the endpoint sets what it is given, so a replay converges.
 */
interface Input {
  postId: number;
  name?: string;
  text?: string;
  bodyJson?: unknown;
  publishedAt?: string;
  topics?: string;
  isPinned?: boolean;
  isCommentsEnabled?: boolean;
  isCommentsClosed?: boolean;
  isLikingEnabled?: boolean;
  skipNotifications?: boolean;
}

const postUpdate: ActionDefinition<Input> = {
  key: "post-update",
  type: "perform",
  resource: "post",
  title: "Update Post",
  description:
    "Edit a post's title, body or settings. Only the fields you supply are touched; a supplied " +
    "body replaces the whole document.",
  idempotent: true,
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    { key: "name", label: "Title", type: "string" },
    {
      key: "text",
      label: "Body",
      type: "text",
      config: { multiline: true },
      hint: "Plain text. REPLACES the whole body — leave blank to keep the existing one. " +
        "To edit in place, round-trip `tiptap_body` from `post-get` through the JSON param.",
    },
    bodyJsonParam,
    { key: "publishedAt", label: "Publish at", type: "datetime" },
    idListParam("topics", "Topic IDs", "Comma-separated topic ids. Replaces the post's topics."),
    { key: "isPinned", label: "Pinned", type: "boolean", advanced: true },
    {
      key: "isCommentsEnabled",
      label: "Comments enabled",
      type: "boolean",
      advanced: true,
    },
    {
      key: "isCommentsClosed",
      label: "Comments closed",
      type: "boolean",
      advanced: true,
      hint: "Existing comments stay visible; no new ones are accepted.",
    },
    { key: "isLikingEnabled", label: "Liking enabled", type: "boolean", advanced: true },
    skipNotificationsParam,
  ],
  output: postOutput,

  execute(input, ctx) {
    const hasBody = (input.text !== undefined && input.text !== "") ||
      (input.bodyJson !== undefined && input.bodyJson !== null && input.bodyJson !== "");

    return new CircleClient(ctx).request(
      `/posts/${encodeURIComponent(String(input.postId))}`,
      {
        method: "PUT",
        body: compact({
          name: unset(input.name),
          tiptap_body: hasBody ? resolveBody(input.text, input.bodyJson, "Post body") : undefined,
          published_at: unset(input.publishedAt),
          topics: idList(input.topics),
          // Genuine booleans: `false` is a value here, not an absence.
          is_pinned: input.isPinned,
          is_comments_enabled: input.isCommentsEnabled,
          is_comments_closed: input.isCommentsClosed,
          is_liking_enabled: input.isLikingEnabled,
          skip_notifications: input.skipNotifications ? true : undefined,
        }),
      },
    );
  },
};

export default postUpdate;
