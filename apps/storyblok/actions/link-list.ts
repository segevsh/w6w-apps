import type { ActionDefinition } from "@w6w/types";
import { assertCredential, query, StoryblokClient } from "../lib/client.ts";

/**
 * `GET /v2/cdn/links` — the site's tree, without its content.
 *
 * ## The right call for anything about structure
 *
 * A links response is one small object per story: id, uuid, slug, name,
 * parent, whether it is a folder, whether it is published. No content at all.
 *
 * That makes it the correct way to build a navigation menu, a sitemap, or a
 * "does this path exist" check — all of which are usually done by listing
 * *stories*, which drags every story's full content across the wire to read
 * one field from each. On a space with a thousand pages the difference is
 * megabytes per request, and it is why `story-list`'s rate limit hurts and
 * this one rarely does.
 *
 * ## Folders are in here, and they are not pages
 *
 * `is_folder` marks a container with no content of its own. A menu builder
 * that treats them as pages produces links to nothing; one that drops them
 * loses the hierarchy. Both are returned, separated.
 *
 * ## `paginated` changed the shape
 *
 * By default the response is an object keyed by story id, not an array — a
 * shape that surprises everybody once. With `paginated=1` it pages properly.
 * This action always paginates and hands back an array.
 */
const action: ActionDefinition = {
  key: "link-list",
  type: "read",
  resource: "link",
  title: "List links",
  description:
    "The site tree without any content — one small object per story. The right call for " +
    "navigation, sitemaps and path checks, all of which are usually done by listing STORIES and " +
    "dragging every story's content across to read one field.",
  params: [
    {
      key: "startsWith",
      label: "Path prefix",
      type: "string",
      default: "",
      placeholder: "blog/",
    },
    {
      key: "version",
      label: "Version",
      type: "select",
      default: "published",
      options: [
        { value: "published", label: "Published" },
        { value: "draft", label: "Draft — needs a preview token" },
      ],
    },
    {
      key: "includeFolders",
      label: "Include folders",
      type: "boolean",
      default: true,
      hint: "Folders have no content of their own — a menu that links to one links to nothing.",
    },
    { key: "perPage", label: "Per page", type: "number", default: 100 },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "cacheVersion",
      label: "Cache version",
      type: "number",
      default: 0,
      advanced: true,
    },
  ],
  output: [
    { key: "links", type: "array", label: "The tree entries" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "total", type: "number", label: "How many in all" },
    { key: "slugs", type: "array", label: "Every path" },
    { key: "folders", type: "array", label: "Containers, which are not pages" },
    { key: "unpublished", type: "array", label: "Present in the tree and not live" },
    { key: "roots", type: "array", label: "Entries with no parent" },
    { key: "cv", type: "number", label: "Pass this to the next call" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "delivery");

    const result = await new StoryblokClient(ctx).delivery<{
      links?:
        | Record<string, {
          id?: number;
          uuid?: string;
          slug?: string;
          name?: string;
          parent_id?: number | null;
          is_folder?: boolean;
          published?: boolean;
        }>
        | Array<Record<string, unknown>>;
      cv?: number;
    }>("/links", {
      query: query({
        starts_with: String(p.startsWith ?? "").trim(),
        version: String(p.version ?? "published"),
        // Without this the response is an object keyed by id, not an array.
        paginated: 1,
        per_page: Math.max(1, Math.min(1000, Number(p.perPage ?? 100))),
        page: Math.max(1, Number(p.page ?? 1)),
        cv: Number(p.cacheVersion ?? 0) || undefined,
      }),
    });

    const raw = result.data?.links;
    const entries = Array.isArray(raw)
      ? raw as Array<Record<string, unknown>>
      : Object.values(raw ?? {}) as Array<Record<string, unknown>>;

    const links = entries.map((entry) => ({
      id: entry?.id,
      uuid: entry?.uuid,
      slug: entry?.slug,
      name: entry?.name,
      parentId: entry?.parent_id ?? null,
      isFolder: entry?.is_folder === true,
      published: entry?.published === true,
    }));

    const pages = p.includeFolders === false ? links.filter((link) => !link.isFolder) : links;

    return {
      links: pages,
      count: pages.length,
      total: result.total,
      slugs: pages.map((link) => link.slug).filter(Boolean),
      folders: links.filter((link) => link.isFolder).map((link) => link.slug).filter(Boolean),
      // In the tree, and not live — invisible from the published site.
      unpublished: links
        .filter((link) => !link.isFolder && !link.published)
        .map((link) => link.slug)
        .filter(Boolean),
      roots: links.filter((link) => !link.parentId).map((link) => link.slug).filter(Boolean),
      cv: result.cv,
    };
  },
};

export default action;
