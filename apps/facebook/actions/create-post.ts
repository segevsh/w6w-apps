import type { ActionDefinition } from "@w6w/types";
import { FacebookClient } from "../lib/client.ts";

interface Input {
  pageId: string;
  message?: string;
  link?: string;
  published?: boolean;
}

/**
 * Publish a post to a Page's feed — `POST /{page-id}/feed`. Facebook requires
 * at least one of `message` / `link`; both may be set (a link share with a
 * caption).
 *
 * Image/video attachments are deliberately out of scope for this action —
 * Facebook's photo/video upload edges (`{page-id}/photos`, `{page-id}/videos`)
 * are separate write paths with their own response shape (a `post_id`), and
 * are covered by `upload-photo` instead.
 *
 * Not `idempotent`: Facebook documents no request-level dedupe key for feed
 * posts, so a retried call creates a second post.
 */
const createPost: ActionDefinition<Input, { id: string }> = {
  key: "create-post",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description: "Publish a text or link post to a Page's feed.",
  idempotent: false,
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    {
      key: "message",
      label: "Message",
      type: "text",
      hint: "The post body. Either Message or Link (or both) is required.",
    },
    { key: "link", label: "Link", type: "string", hint: "A URL to share." },
    {
      key: "published",
      label: "Published",
      type: "boolean",
      default: true,
      hint: "Set false to save as an unpublished draft/dark post.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Post ID" }],

  execute(input, ctx) {
    if (!input.message && !input.link) {
      throw new Error("create-post requires message and/or link");
    }
    const client = new FacebookClient(ctx);
    return client.request<{ id: string }>(`/${input.pageId}/feed`, {
      method: "POST",
      params: {
        message: input.message,
        link: input.link,
        published: input.published ?? true,
      },
    });
  },
};

export default createPost;
