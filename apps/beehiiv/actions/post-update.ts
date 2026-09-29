import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, rawFetch, toList } from "../lib/client.ts";
import { postIdParam, publicationIdParam } from "../lib/params.ts";

interface Input {
  publicationId: string;
  postId: string;
  title?: string;
  subtitle?: string;
  bodyContent?: string;
  blocks?: unknown;
  contentMergeStrategy?: "replace" | "append_to_template" | "append" | "prepend";
  status?: "confirmed";
  scheduledAt?: string;
  thumbnailImageUrl?: string;
  contentTags?: string;
  newsletterListId?: string;
  emailSettings?: unknown;
  webSettings?: unknown;
  seoSettings?: unknown;
}

/**
 * `PATCH /publications/{publicationId}/posts/{postId}`.
 *
 * Only the fields provided are updated. Only the `draft` → `confirmed`
 * status transition is supported. Like Create Post, this can answer `202`
 * (still processing in the background) — surfaced as `processing: true`
 * rather than the updated post.
 */
const postUpdate: ActionDefinition<Input> = {
  key: "post-update",
  type: "perform",
  resource: "post",
  title: "Update Post",
  description: "Update an existing post (Max/Enterprise plans only). Only given fields change.",
  idempotent: true,
  params: [
    publicationIdParam,
    postIdParam,
    { key: "title", label: "Title", type: "string" },
    { key: "subtitle", label: "Subtitle", type: "string" },
    {
      key: "bodyContent",
      label: "Body (raw HTML)",
      type: "text",
      hint: "Replaces existing content. Provide this OR `blocks`, not both.",
    },
    { key: "blocks", label: "Blocks (structured content JSON)", type: "json" },
    {
      key: "contentMergeStrategy",
      label: "Content merge strategy",
      type: "select",
      options: [
        { value: "replace", label: "Replace (default)" },
        { value: "append_to_template", label: "Append to template" },
        { value: "append", label: "Append" },
        { value: "prepend", label: "Prepend" },
      ],
      hint: "How `blocks` interacts with the post's existing content.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "confirmed", label: "Confirmed — publish/schedule this draft" }],
      hint: "Only the draft → confirmed transition is supported.",
    },
    { key: "scheduledAt", label: "Scheduled at", type: "datetime" },
    { key: "thumbnailImageUrl", label: "Thumbnail image URL", type: "string" },
    {
      key: "contentTags",
      label: "Content tags",
      type: "string",
      hint: "Replaces all existing tags.",
    },
    { key: "newsletterListId", label: "Newsletter list ID", type: "string" },
    { key: "emailSettings", label: "Email settings (JSON)", type: "json" },
    { key: "webSettings", label: "Web settings (JSON)", type: "json" },
    { key: "seoSettings", label: "SEO settings (JSON)", type: "json" },
  ],
  output: [
    { key: "processing", type: "boolean", label: "True while the update is still being applied" },
    { key: "id", type: "string", label: "Post ID" },
    { key: "title", type: "string", label: "Title — absent while processing" },
  ],

  async execute(input, ctx) {
    if (input.bodyContent && input.blocks) {
      throw new Error("Provide bodyContent OR blocks, not both — beehiiv rejects both together.");
    }
    const path = `/publications/${encodeURIComponent(input.publicationId)}/posts/${
      encodeURIComponent(input.postId)
    }`;
    const { status, text, body } = await rawFetch(ctx, path, {
      method: "PATCH",
      body: compact({
        title: input.title,
        subtitle: input.subtitle,
        body_content: input.bodyContent,
        blocks: asOptionalJson(input.blocks, "blocks"),
        content_merge_strategy: input.contentMergeStrategy,
        status: input.status,
        scheduled_at: input.scheduledAt,
        thumbnail_image_url: input.thumbnailImageUrl,
        content_tags: toList(input.contentTags),
        newsletter_list_id: input.newsletterListId,
        email_settings: asOptionalJson(input.emailSettings, "emailSettings"),
        web_settings: asOptionalJson(input.webSettings, "webSettings"),
        seo_settings: asOptionalJson(input.seoSettings, "seoSettings"),
      }),
    });

    if (status === 202) {
      const processing = body as { data?: { id?: string; state?: string } } | null;
      return {
        processing: true,
        id: processing?.data?.id ?? input.postId,
        state: processing?.data?.state ?? "pending",
      };
    }
    if (status < 200 || status >= 300) {
      throw new Error(`beehiiv ${status} for PATCH ${path}: ${text}`);
    }
    const ok = body as { data?: Record<string, unknown> } | null;
    return { processing: false, ...(ok?.data ?? {}) };
  },
};

export default postUpdate;
