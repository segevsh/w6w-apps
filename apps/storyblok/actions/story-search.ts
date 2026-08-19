import type { ActionDefinition } from "@w6w/types";
import { assertCredential, query, spaceIdOf, StoryblokClient } from "../lib/client.ts";

/**
 * `GET /v1/spaces/{id}/stories` — the same content, seen from the editor's
 * side.
 *
 * ## This is not `story-list` with a different credential
 *
 * The delivery API serves *content*, cached, in one of two versions. The
 * Management API serves the **record**: who last edited it, whether it is
 * published, whether it has unpublished changes, which folder it sits in.
 *
 * Two questions only this can answer, and both are ordinary editorial ones:
 *
 * - **Which stories have unpublished changes?** `published` and `unpublished_changes`
 *   together say "live, and somebody has edited it since". The delivery API
 *   cannot see this at all: it has a draft and a published document and no
 *   opinion about the gap between them.
 * - **What was never published?** A story absent from the public site is
 *   absent from the public API too, so it cannot be counted there.
 *
 * ## It is also the slow one
 *
 * The Management API allows **3 to 6 requests a second**, against the delivery
 * API's 50 to 1000. For reading content to render, use the delivery API. This
 * is for questions about editorial state.
 */
const action: ActionDefinition = {
  key: "story-search",
  type: "search",
  resource: "story",
  title: "Search stories (management)",
  description:
    "Stories as the EDITOR sees them — who changed what, what is published, and what has " +
    "UNPUBLISHED CHANGES, which the delivery API cannot see at all. Slower: the Management API " +
    "allows 3 to 6 requests a second.",
  params: [
    {
      key: "search",
      label: "Search term",
      type: "string",
      default: "",
      hint: "Matched against the story's name and content.",
    },
    {
      key: "startsWith",
      label: "Path prefix",
      type: "string",
      default: "",
      placeholder: "blog/",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      default: "",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "Every story" },
        { value: "published", label: "Published" },
        { value: "unpublished", label: "Never published, or unpublished" },
      ],
    },
    {
      key: "inFolderId",
      label: "Folder ID",
      type: "string",
      default: "",
      advanced: true,
    },
    { key: "perPage", label: "Per page", type: "number", default: 25 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "stories", type: "array", label: "The story records" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "total", type: "number", label: "How many match in all" },
    { key: "withUnpublishedChanges", type: "array", label: "Live, and edited since" },
    { key: "neverPublished", type: "array", label: "Not on the site at all" },
    { key: "folders", type: "array", label: "Folders among the results" },
    { key: "ids", type: "array", label: "Numeric ids the write actions take" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "management");
    const spaceId = spaceIdOf(ctx.connection);
    if (!spaceId) throw new Error("this connection records no space id — reconnect to set one");

    const perPage = Math.max(1, Math.min(100, Number(p.perPage ?? 25)));
    const page = Math.max(1, Number(p.page ?? 1));
    const state = String(p.state ?? "all");

    const result = await new StoryblokClient(ctx).managementList<{
      stories?: Array<{
        id?: number;
        uuid?: string;
        name?: string;
        full_slug?: string;
        published?: boolean;
        unpublished_changes?: boolean;
        is_folder?: boolean;
        content_type?: string;
        updated_at?: string;
        published_at?: string | null;
      }>;
    }>(`/spaces/${encodeURIComponent(spaceId)}/stories`, {
      query: query({
        search: String(p.search ?? "").trim(),
        starts_with: String(p.startsWith ?? "").trim(),
        contain_component: String(p.contentType ?? "").trim(),
        with_parent: String(p.inFolderId ?? "").trim(),
        is_published: state === "all" ? undefined : state === "published",
        per_page: perPage,
        page,
      }),
    });

    const stories = result.data?.stories ?? [];
    const label = (story: { full_slug?: string; name?: string }) =>
      story?.full_slug ?? story?.name ?? "";

    return {
      stories,
      count: stories.length,
      total: result.total,
      // Live, and edited since — the delivery API has no opinion about this.
      withUnpublishedChanges: stories
        .filter((story) => story?.published === true && story?.unpublished_changes === true)
        .map(label),
      neverPublished: stories
        .filter((story) => story?.is_folder !== true && !story?.published_at)
        .map(label),
      folders: stories.filter((story) => story?.is_folder === true).map(label),
      ids: stories.map((story) => story?.id).filter(Boolean),
      hasMore: result.total !== undefined
        ? page * perPage < result.total
        : stories.length === perPage,
    };
  },
};

export default action;
