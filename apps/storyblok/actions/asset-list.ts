import type { ActionDefinition } from "@w6w/types";
import { assertCredential, query, spaceIdOf, StoryblokClient } from "../lib/client.ts";

/**
 * `GET /v1/spaces/{id}/assets` — what has been uploaded.
 *
 * ## An asset URL outlives the asset record
 *
 * Storyblok serves assets from `a.storyblok.com` through a CDN that caches for
 * up to a year. Deleting the record does not un-cache the file, and a URL
 * already in somebody's HTML keeps working for a while after the asset is
 * "gone". Convenient, and it means asset deletion is not a way to make
 * something unavailable.
 *
 * ## The Image Service is a URL suffix, not a stored variant
 *
 * `/m/800x0/` on the end of an asset URL resizes on the fly. So one asset is
 * every size it will ever be needed at, and a workflow does not have to
 * generate thumbnails — it appends. Worth knowing before somebody builds a
 * resizing pipeline for content that already has one.
 *
 * ## `is_private` assets need their own token
 *
 * A private asset's URL does not work with a public delivery token; it needs
 * an asset token. A workflow that lists assets and hands the URLs to a browser
 * produces broken images for exactly the private ones.
 */
const action: ActionDefinition = {
  key: "asset-list",
  type: "search",
  resource: "asset",
  title: "List assets",
  description:
    "Uploaded files. Note an asset URL is a CDN URL that outlives the record by up to a year, " +
    "the Image Service resizes by URL SUFFIX rather than stored variants, and a PRIVATE asset " +
    "needs its own token to load.",
  params: [
    {
      key: "search",
      label: "Search term",
      type: "string",
      default: "",
      hint: "Matched against the filename.",
    },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      default: "",
    },
    { key: "perPage", label: "Per page", type: "number", default: 25 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "assets", type: "array", label: "The assets" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "total", type: "number", label: "How many in all" },
    { key: "urls", type: "array", label: "Their CDN URLs" },
    { key: "privateCount", type: "number", label: "Assets a public token cannot load" },
    { key: "totalBytes", type: "number", label: "How much storage they use" },
    { key: "withoutAltText", type: "array", label: "Images with no alt text" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "management");
    const spaceId = spaceIdOf(ctx.connection);
    if (!spaceId) throw new Error("this connection records no space id — reconnect to set one");

    const perPage = Math.max(1, Math.min(100, Number(p.perPage ?? 25)));
    const page = Math.max(1, Number(p.page ?? 1));

    const result = await new StoryblokClient(ctx).managementList<{
      assets?: Array<{
        id?: number;
        filename?: string;
        content_type?: string;
        content_length?: number;
        alt?: string | null;
        is_private?: boolean;
        created_at?: string;
      }>;
    }>(`/spaces/${encodeURIComponent(spaceId)}/assets`, {
      query: query({
        search: String(p.search ?? "").trim(),
        in_folder: String(p.folderId ?? "").trim(),
        per_page: perPage,
        page,
      }),
    });

    const assets = result.data?.assets ?? [];
    const isImage = (asset: { content_type?: string }) =>
      String(asset?.content_type ?? "").startsWith("image/");

    return {
      assets,
      count: assets.length,
      total: result.total,
      urls: assets.map((asset) => asset?.filename).filter(Boolean),
      // These need an asset token; a public one gives a broken image.
      privateCount: assets.filter((asset) => asset?.is_private === true).length,
      totalBytes: assets.reduce((sum, asset) => sum + Number(asset?.content_length ?? 0), 0),
      withoutAltText: assets
        .filter((asset) => isImage(asset) && !String(asset?.alt ?? "").trim())
        .map((asset) => asset?.filename)
        .filter(Boolean),
      hasMore: result.total !== undefined
        ? page * perPage < result.total
        : assets.length === perPage,
    };
  },
};

export default action;
