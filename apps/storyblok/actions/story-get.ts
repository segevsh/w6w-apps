import type { ActionDefinition } from "@w6w/types";
import { assertCredential, csv, query, StoryblokClient } from "../lib/client.ts";

/**
 * `GET /v2/cdn/stories/{slug}` — one content entry, as the site sees it.
 *
 * ## `draft` and `published` are two different documents
 *
 * Not two states of one: Storyblok stores them separately. A story edited and
 * not published has a draft that differs from what the world sees, and
 * `version` decides which this returns. A **public** token cannot read the
 * draft at all — the request succeeds and returns the published version, or
 * 404s if there is none — so "the change is not showing" is usually the token
 * rather than the cache.
 *
 * ## `resolve_relations` is the difference between an id and a story
 *
 * A story that references another holds its **uuid**, not its content. Without
 * `resolve_relations` naming the field, a workflow gets a uuid and has to
 * fetch again; with it, Storyblok inlines the referenced story. There is a
 * ceiling — relations resolve to a limited depth, and a self-referencing tree
 * will not unroll forever.
 *
 * ## `cv` is what makes the next request cheap
 *
 * The response carries a cache version. Passing it to subsequent calls moves
 * them from 50 requests a second to a thousand, so this action returns it and
 * accepts it.
 */
const action: ActionDefinition = {
  key: "story-get",
  type: "read",
  resource: "story",
  title: "Get a story",
  description:
    "One content entry through the delivery API. DRAFT and PUBLISHED are separate documents, and " +
    "a public token cannot see the draft at all — which is why an edit 'does not show'. Returns " +
    "the `cv` cache version, which makes the next request twenty times cheaper.",
  params: [
    {
      key: "slug",
      label: "Slug or UUID",
      type: "string",
      required: true,
      default: "",
      placeholder: "home or blog/my-post",
      hint: "The full slug including any folders, or the story's uuid.",
    },
    {
      key: "version",
      label: "Version",
      type: "select",
      default: "published",
      options: [
        { value: "published", label: "Published — what the site serves" },
        { value: "draft", label: "Draft — needs a PREVIEW token" },
      ],
    },
    {
      key: "resolveRelations",
      label: "Resolve relations",
      type: "string",
      default: "",
      placeholder: "article.author, page.related",
      hint: "Comma-separated `component.field` pairs. Without these a referenced story is a UUID " +
        "rather than its content.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      default: "",
      hint: "A field-level translation code. Leave empty for the default language.",
    },
    {
      key: "cacheVersion",
      label: "Cache version",
      type: "number",
      default: 0,
      advanced: true,
      hint: "The `cv` from a previous call or from `space-get`. With it the request is served " +
        "from the CDN at 1000/s rather than hitting the backend at 50/s.",
    },
  ],
  output: [
    { key: "story", type: "object", label: "The story" },
    { key: "content", type: "object", label: "Just its content" },
    { key: "id", type: "number", label: "Numeric id — what the Management API takes" },
    { key: "uuid", type: "string", label: "Stable across renames and moves" },
    { key: "slug", type: "string", label: "Its path" },
    { key: "name", type: "string", label: "Its name in the editor" },
    { key: "publishedAt", type: "string", label: "When it was last published" },
    { key: "isPublished", type: "boolean", label: "Whether it has ever been published" },
    { key: "componentType", type: "string", label: "The content type of the root block" },
    { key: "cv", type: "number", label: "Pass this to the next call" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "delivery");

    const slug = String(p.slug ?? "").trim().replace(/^\/+/, "");
    if (!slug) throw new Error("`slug` is required");
    const version = String(p.version ?? "published");

    const result = await new StoryblokClient(ctx).delivery<{
      story?: {
        id?: number;
        uuid?: string;
        slug?: string;
        full_slug?: string;
        name?: string;
        published_at?: string | null;
        content?: Record<string, unknown>;
      };
      cv?: number;
    }>(`/stories/${slug.split("/").map(encodeURIComponent).join("/")}`, {
      query: query({
        version,
        resolve_relations: csv(p.resolveRelations)?.join(","),
        language: String(p.language ?? "").trim(),
        cv: Number(p.cacheVersion ?? 0) || undefined,
      }),
    });

    const story = result.data?.story;
    if (!story) throw new Error(`no story at ${slug}`);

    if (version === "draft") {
      ctx.log(
        "info",
        "this is the DRAFT version, which differs from what the site serves until somebody " +
          "publishes it",
        { slug },
      );
    }

    return {
      story,
      content: story.content,
      id: story.id,
      // The uuid survives renames and moves; the slug does not.
      uuid: story.uuid,
      slug: story.full_slug ?? story.slug,
      name: story.name,
      publishedAt: story.published_at ?? undefined,
      isPublished: Boolean(story.published_at),
      componentType: String(story.content?.component ?? ""),
      cv: result.cv,
    };
  },
};

export default action;
