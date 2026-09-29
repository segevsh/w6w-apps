import type { ActionDefinition } from "@w6w/types";
import { compact, rawFetch, toList } from "../lib/client.ts";
import { bracketQuery, postIdParam, publicationIdParam } from "../lib/params.ts";

interface Input {
  publicationId: string;
  postId: string;
  expand?: string;
  premiumTiers?: string;
}

/**
 * `GET /publications/{publicationId}/posts/{postId}`.
 *
 * A post created via the Send API (`post-create`) is built asynchronously. If
 * it is still building, beehiiv answers `202` with `{data: {id, state}}`
 * rather than the post itself — surfaced here as `processing: true` instead
 * of throwing, since it is not an error. If background creation failed for
 * good, beehiiv answers `404 POST_CREATION_FAILED` — surfaced as a thrown
 * error, since retrying will never succeed and the caller must re-create it.
 */
const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Fetch a single post. A post created via Create Post may still be building in the " +
    "background — check the `processing` output field before reading the rest.",
  params: [
    publicationIdParam,
    postIdParam,
    {
      key: "expand",
      label: "Expand",
      type: "string",
      hint: "Comma-separated: `stats`, `free_web_content`, `free_email_content`, " +
        "`free_rss_content`, `premium_web_content`, `premium_email_content`.",
    },
    {
      key: "premiumTiers",
      label: "Premium tiers (scopes expanded content)",
      type: "string",
      hint: "Comma-separated premium tier display names (case-insensitive).",
    },
  ],
  output: [
    { key: "processing", type: "boolean", label: "True while the post is still being built" },
    { key: "id", type: "string", label: "Post ID" },
    { key: "title", type: "string", label: "Title — absent while processing" },
    { key: "status", type: "string", label: "Status — absent while processing" },
  ],

  async execute(input, ctx) {
    const path = `/publications/${encodeURIComponent(input.publicationId)}/posts/${
      encodeURIComponent(input.postId)
    }`;
    const { status, text, body } = await rawFetch(ctx, path, {
      query: {
        ...compact({ premium_tiers: input.premiumTiers }),
        ...bracketQuery("expand", toList(input.expand)),
      },
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
      const errors = (body as { errors?: Array<{ code?: string; message?: string }> } | null)
        ?.errors;
      const code = errors?.[0]?.code;
      if (status === 404 && code === "POST_CREATION_FAILED") {
        throw new Error(
          "beehiiv POST_CREATION_FAILED: this post's background creation failed permanently — " +
            "verify the request and create it again rather than retrying this read.",
        );
      }
      throw new Error(`beehiiv ${status} for GET ${path}: ${text}`);
    }

    const ok = body as { data?: Record<string, unknown> } | null;
    return { processing: false, ...(ok?.data ?? {}) };
  },
};

export default postGet;
