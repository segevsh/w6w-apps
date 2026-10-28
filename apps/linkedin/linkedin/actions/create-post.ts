import type { ActionDefinition } from "@w6w/types";
import { LinkedInClient, organizationUrn, personUrn } from "../lib/client.ts";
import { escapeLittleText } from "../lib/little-text.ts";

interface Input {
  authorType: "person" | "organization";
  authorId: string;
  commentary: string;
  visibility?: "PUBLIC" | "CONNECTIONS";
  contentType?: "none" | "article";
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
  articleThumbnailImageUrn?: string;
}

/**
 * `POST /rest/posts` — the current Posts API, which replaced the legacy
 * `/v2/ugcPosts`. Ported from n8n's `LinkedIn` node's `post:create` operation,
 * updated to the modern request shape (`commentary` + `content.article`
 * instead of `specificContent`/`shareCommentary`) per LinkedIn's own docs:
 * https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 *
 * Image posts are deliberately NOT supported here. Attaching an image means
 * a two-step upload (`POST /rest/images?action=initializeUpload`, then PUT
 * the binary to the *returned* `uploadUrl`) — and that URL isn't
 * `api.linkedin.com`, it's a per-request presigned host LinkedIn hands back
 * at call time. This app's sandbox egress allowlist is static
 * (`w6w.network.allow`), so it can't be declared in advance. Article posts
 * can still reference an image via `articleThumbnailImageUrn` if you already
 * have one uploaded (e.g. through LinkedIn's own tooling).
 *
 * Not `idempotent`: LinkedIn documents no request-level dedupe key for post
 * creation, so a retried call creates a second post.
 */
const createPost: ActionDefinition<Input> = {
  key: "create-post",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description: "Publish a text or article post as yourself or as an organization you manage.",
  idempotent: false,
  params: [
    {
      key: "authorType",
      label: "Post As",
      type: "select",
      required: true,
      default: "person",
      options: [
        { value: "person", label: "Myself" },
        { value: "organization", label: "Organization" },
      ],
    },
    {
      key: "authorId",
      label: "Author ID",
      type: "string",
      required: true,
      hint: 'For "Myself": your member id (the `sub` from Get Current Member Profile). ' +
        'For "Organization": the numeric company page id. Requires the Community ' +
        "Management auth method and w_organization_social.",
    },
    {
      key: "commentary",
      label: "Text",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "The post body. Reserved little-text characters are escaped automatically.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      default: "PUBLIC",
      options: [
        { value: "PUBLIC", label: "Public" },
        { value: "CONNECTIONS", label: "Connections only" },
      ],
      hint: "Connections-only visibility only applies when posting as yourself.",
    },
    {
      key: "contentType",
      label: "Content Type",
      type: "select",
      default: "none",
      options: [
        { value: "none", label: "Text only" },
        { value: "article", label: "Article / URL" },
      ],
    },
    {
      key: "articleUrl",
      label: "Article URL",
      type: "string",
      hint: 'Required when Content Type is "Article / URL".',
      showIf: { field: "contentType", eq: "article" },
    },
    {
      key: "articleTitle",
      label: "Article Title",
      type: "string",
      advanced: true,
      showIf: { field: "contentType", eq: "article" },
    },
    {
      key: "articleDescription",
      label: "Article Description",
      type: "text",
      advanced: true,
      showIf: { field: "contentType", eq: "article" },
    },
    {
      key: "articleThumbnailImageUrn",
      label: "Article Thumbnail Image URN",
      type: "string",
      advanced: true,
      hint: "An already-uploaded `urn:li:image:...`. This action does not upload images.",
      showIf: { field: "contentType", eq: "article" },
    },
  ],
  output: [{ key: "id", type: "string", label: "Post URN" }],

  async execute(input, ctx) {
    const author = input.authorType === "organization"
      ? organizationUrn(input.authorId)
      : personUrn(input.authorId);

    const body: Record<string, unknown> = {
      author,
      commentary: escapeLittleText(input.commentary),
      visibility: input.visibility ?? "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    if (input.contentType === "article") {
      if (!input.articleUrl) {
        throw new Error('articleUrl is required when contentType is "article"');
      }
      body.content = {
        article: {
          source: input.articleUrl,
          title: input.articleTitle || undefined,
          description: input.articleDescription || undefined,
          thumbnail: input.articleThumbnailImageUrn || undefined,
        },
      };
    }

    const client = new LinkedInClient(ctx);
    const result = await client.request<{ id: string }>("/rest/posts", {
      method: "POST",
      body,
    });
    return { id: result.id };
  },
};

export default createPost;
