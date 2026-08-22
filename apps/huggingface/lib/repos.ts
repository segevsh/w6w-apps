import type { ActionDefinition } from "@w6w/types";
import { csv, HuggingFaceClient, isGated, query, repoId } from "./client.ts";

/**
 * Models, datasets and Spaces are the same object with three names.
 *
 * The Hub calls them all *repositories*: same id shape, same file tree, same
 * gating, same visibility rules. The three list endpoints differ only in the
 * filters they accept, so the search and detail actions here are generated from
 * one place rather than written three times with three sets of drifting
 * comments.
 *
 * The one meaningful difference is the sort field: models and datasets sort by
 * `downloads`, Spaces by `likes` — Spaces are applications and nobody
 * downloads them.
 */

export type RepoKind = "models" | "datasets" | "spaces";

export function searchAction(options: {
  kind: RepoKind;
  key: string;
  title: string;
  description: string;
  extraParams?: ActionDefinition["params"];
}): ActionDefinition {
  const singular = options.kind.slice(0, -1);
  return {
    key: options.key,
    type: "search",
    resource: singular,
    title: options.title,
    description: options.description,
    params: [
      {
        key: "search",
        label: "Search",
        type: "string",
        default: "",
        hint: "Matches the repository id and its card. Blank returns whatever the sort puts first.",
      },
      {
        key: "author",
        label: "Owner",
        type: "string",
        default: "",
        hint: "A user or organisation name — the part before the slash.",
      },
      {
        key: "filter",
        label: "Tags",
        type: "string",
        default: "",
        hint: "Comma-separated Hub tags. All of them must match, so a long list usually returns " +
          "nothing.",
      },
      {
        key: "sort",
        label: "Sort By",
        type: "select",
        default: options.kind === "spaces" ? "likes" : "downloads",
        options: options.kind === "spaces"
          ? [
            { value: "likes", label: "Likes" },
            { value: "trendingScore", label: "Trending" },
            { value: "lastModified", label: "Recently updated" },
            { value: "createdAt", label: "Newest" },
          ]
          : [
            { value: "downloads", label: "Downloads" },
            { value: "likes", label: "Likes" },
            { value: "trendingScore", label: "Trending" },
            { value: "lastModified", label: "Recently updated" },
            { value: "createdAt", label: "Newest" },
          ],
      },
      ...(options.extraParams ?? []),
      {
        key: "limit",
        label: "Limit",
        type: "number",
        default: 20,
        hint: "The Hub caps a page well below what a large search matches — this is a page size, " +
          "not a total.",
      },
      {
        key: "cursor",
        label: "Cursor",
        type: "string",
        default: "",
        hint:
          "The `cursor` from the previous page's output. It is opaque and encodes the sort; the\n" +
          "Hub stops sending one at the last page.",
      },
    ],
    output: [
      { key: "results", type: "array", label: `Matching ${options.kind}` },
      { key: "count", type: "number", label: "Returned in this page" },
      { key: "ids", type: "array", label: "Just the repository ids" },
      { key: "gatedCount", type: "number", label: "How many need terms accepting before download" },
      { key: "cursor", type: "string", label: "Pass back for the next page; absent at the last" },
    ],

    async execute(input, ctx) {
      const p = input as Record<string, unknown>;
      const client = new HuggingFaceClient(ctx);

      const result = await client.full<Array<{ id?: string; gated?: unknown }>>(
        `/api/${options.kind}`,
        {
          query: query({
            search: p.search,
            author: p.author,
            filter: csv(p.filter)?.join(","),
            sort: p.sort,
            direction: -1,
            limit: Math.max(1, Number(p.limit ?? 20)),
            cursor: p.cursor,
            ...(options.kind === "models" && p.pipelineTag ? { pipeline_tag: p.pipelineTag } : {}),
          }),
        },
      );

      const results = Array.isArray(result.data) ? result.data : [];
      // A gated repository is searchable and not downloadable, and only a
      // person can change that.
      const gatedCount = results.filter((repo) => isGated(repo?.gated)).length;

      ctx.log("info", `searched the Hugging Face Hub for ${options.kind}`, {
        count: results.length,
        gatedCount,
      });

      return {
        results,
        count: results.length,
        ids: results.map((repo) => repo?.id).filter(Boolean),
        gatedCount,
        cursor: nextCursor(result.link),
      };
    },
  };
}

/**
 * The next page's cursor, out of the `Link` header.
 *
 * The Hub does not put a cursor in the body, and it does not put one in the
 * response URL either — it sends
 * `Link: <https://huggingface.co/api/models?cursor=…>; rel="next"`, and the
 * cursor is a query parameter of *that* URL. Reading the cursor off the URL
 * that was requested instead returns the cursor of the page just fetched, so
 * a paging loop asks for the same page forever while looking like it works.
 *
 * The header is absent on the last page, which is how paging ends.
 */
export function nextCursor(link: string | null): string | undefined {
  if (!link) return undefined;
  for (const part of link.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel\s*=\s*"?next"?/i);
    if (!match) continue;
    try {
      return new URL(match[1]).searchParams.get("cursor") ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function detailAction(options: {
  kind: RepoKind;
  key: string;
  title: string;
  description: string;
}): ActionDefinition {
  const singular = options.kind.slice(0, -1);
  return {
    key: options.key,
    type: "read",
    resource: singular,
    title: options.title,
    description: options.description,
    params: [
      {
        key: "id",
        label: "Repository",
        type: "string",
        required: true,
        default: "",
        placeholder: options.kind === "models" ? "openai-community/gpt2" : "rajpurkar/squad",
        hint: "`namespace/name`. A bare legacy name still works and redirects — this reports " +
          "where it landed, which is the only sign a stored id is historical.",
      },
      {
        key: "revision",
        label: "Revision",
        type: "string",
        default: "",
        advanced: true,
        hint: "A branch, tag or commit SHA. Blank means the default branch, which MOVES — pin a " +
          "SHA for anything reproducible.",
      },
    ],
    output: [
      { key: singular, type: "object", label: "The repository" },
      { key: "id", type: "string", label: "Its canonical id, after any rename" },
      { key: "renamed", type: "boolean", label: "Whether the id given was historical" },
      { key: "gated", type: "boolean", label: "Whether downloads need terms accepting" },
      { key: "private", type: "boolean", label: "Whether it is private" },
      { key: "sha", type: "string", label: "The commit this revision resolves to" },
      { key: "downloads", type: "number", label: "Downloads in the last month" },
    ],

    async execute(input, ctx) {
      const p = input as Record<string, unknown>;
      const id = repoId(p.id, "id");
      const revision = String(p.revision ?? "").trim();

      const path = revision
        ? `/api/${options.kind}/${id}/revision/${encodeURIComponent(revision)}`
        : `/api/${options.kind}/${id}`;
      const result = await new HuggingFaceClient(ctx).full<{
        id?: string;
        gated?: unknown;
        private?: boolean;
        sha?: string;
        downloads?: number;
      }>(path);

      const repo = result.data;
      const gated = isGated(repo?.gated);
      if (result.redirected) {
        ctx.log(
          "warn",
          "this repository has been renamed — the id given is historical and redirected",
          { canonical: repo?.id },
        );
      }

      return {
        [singular]: repo,
        // The canonical id, which is what should be stored from now on.
        id: repo?.id ?? id,
        renamed: result.redirected,
        gated,
        private: repo?.private === true,
        sha: repo?.sha,
        downloads: repo?.downloads,
      };
    },
  };
}
