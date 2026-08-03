import type { ActionDefinition } from "@w6w/types";
import { CircleClient, compact, idList, unset } from "../lib/client.ts";
import {
  bodyJsonParam,
  bodyTextParam,
  idListParam,
  postOutput,
  postWriteStatusOptions,
  skipNotificationsParam,
  spaceIdParam,
} from "../lib/params.ts";
import { resolveBody } from "../lib/tiptap.ts";

/**
 * `POST /posts` — publish a post into a Posts-type space.
 *
 * ## The body is a TipTap document, not a string
 *
 * Circle's description: "Creates a basic post in a basic-type space. Use
 * `tiptap_body` instead of `body_html` for rich text content." The schema backs
 * that up — there is no `body`, no `body_html` and no `raw` on this endpoint,
 * only `tiptap_body`, a nested ProseMirror document.
 *
 * So `lib/tiptap.ts` builds one from plain text, and `bodyJson` passes a real
 * document straight through for headings, lists, mentions and embeds. The two
 * are mutually exclusive and `resolveBody` rejects both-or-neither rather than
 * silently preferring one.
 *
 * ## Authoring as someone else
 *
 * `user_email` sets the post's author, and Circle marks it "preferred over
 * user_id" — so that is the one exposed. Without it the post is authored by
 * whoever owns the API token, which for a token minted by an admin means every
 * automated post appears under that admin's name. That is a surprising default
 * worth being able to override, and an email is a value a workflow actually has
 * to hand, where a Circle `user_id` usually is not.
 *
 * ## Two fields that only make sense together
 *
 * `status: "scheduled"` needs a future `published_at`; scheduling without a
 * time, or setting a future time without the status, does not do what it looks
 * like. The hint on each names the other.
 *
 * ## Not exposed
 *
 * `cover_image` and `cardview_thumbnail` take a `signed_id` from Circle's
 * direct-upload flow, not a URL — nothing an action can synthesise. `created_at`
 * is accepted (a backdating hook for migrations) but is left out: a post whose
 * creation time disagrees with its publication time is a migration concern, and
 * `published_at` already covers the ordinary case.
 *
 * Not idempotent: every call mints a new post, and Circle has no upsert form
 * for one.
 */
interface Input {
  spaceId: number;
  name: string;
  text?: string;
  bodyJson?: unknown;
  status?: string;
  publishedAt?: string;
  authorEmail?: string;
  slug?: string;
  topics?: string;
  isPinned?: boolean;
  skipNotifications?: boolean;
}

const postCreate: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description: "Publish a post into a Posts-type space, authored by any member.",
  idempotent: false,
  params: [
    spaceIdParam(
      true,
      "Must be a Posts-type space. `space-list` returns the type alongside the id.",
    ),
    { key: "name", label: "Title", type: "string", required: true },
    bodyTextParam,
    bodyJsonParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: postWriteStatusOptions,
      hint: "`scheduled` requires a future publish time below.",
    },
    {
      key: "publishedAt",
      label: "Publish at",
      type: "datetime",
      hint: "Pair a future time with status `scheduled` — a future time alone does not schedule " +
        "the post.",
    },
    {
      key: "authorEmail",
      label: "Author email",
      type: "string",
      hint: "Post as this member. Without it the post is authored by the token's owner. Circle " +
        "prefers the address over a numeric user id.",
    },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      advanced: true,
      hint: "URL segment. Circle derives one from the title if omitted.",
    },
    idListParam("topics", "Topic IDs", "Comma-separated topic ids to file the post under."),
    {
      key: "isPinned",
      label: "Pin to top of space",
      type: "boolean",
      advanced: true,
    },
    skipNotificationsParam,
  ],
  output: postOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/posts", {
      method: "POST",
      body: compact({
        space_id: input.spaceId,
        name: input.name,
        tiptap_body: resolveBody(input.text, input.bodyJson, "Post body"),
        status: unset(input.status),
        published_at: unset(input.publishedAt),
        user_email: unset(input.authorEmail),
        slug: unset(input.slug),
        topics: idList(input.topics),
        is_pinned: input.isPinned ? true : undefined,
        skip_notifications: input.skipNotifications ? true : undefined,
      }),
    });
  },
};

export default postCreate;
