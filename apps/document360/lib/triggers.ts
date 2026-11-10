import type { ActionDefinition, HookContext, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import workspaceArticleList from "../actions/workspace-article-list.ts";
import { projectIdParam, workspaceIdParam } from "./params.ts";

const PAGE_SIZE = 100;
/** A workspace is watched whole: 10 pages of 100 = 1000 articles. More is refused, not truncated. */
export const MAX_PAGES = 10;

type Summary = Record<string, unknown> & { id?: string };

/** Every article summary of the workspace, by repeated calls to the existing `workspace-article-list`. */
async function allArticles(
  params: { workspaceId?: string; projectId?: string },
  ctx: HookContext,
): Promise<Summary[]> {
  const out: Summary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await workspaceArticleList.execute(
      {
        workspaceId: String(params.workspaceId ?? ""),
        projectId: params.projectId || undefined,
        page,
        pageSize: PAGE_SIZE,
      },
      ctx,
    ) as { items: Summary[]; pagination: { has_more?: boolean } | null };
    out.push(...res.items);
    if (!res.pagination?.has_more) return out;
  }
  throw new Error(
    `the workspace has more than ${
      MAX_PAGES * PAGE_SIZE
    } articles: the article triggers watch at most ${MAX_PAGES * PAGE_SIZE}`,
  );
}

/**
 * Snapshot poll (brief 9.1 c) over `workspace-article-list`: a knowledge-base workspace is a small
 * bounded collection (at most 1000 summaries here). A summary carries the content hash and
 * version fields, so any edit changes the row's hash and shows up as `updated`.
 */
export function articleSnapshot(
  spec: Pick<TriggerDefinition, "key" | "title" | "description" | "output" | "sample"> & {
    updated: boolean;
  },
): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [workspaceIdParam, projectIdParam],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const items = await allArticles(params as Record<string, string>, ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true, updated: spec.updated },
        rows: items.map((a) => ({ key: String(a.id), values: a })),
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}

export const articleOutput = [
  { key: "id", type: "string", label: "Article ID" },
  { key: "title", type: "string", label: "Title" },
  { key: "status", type: "string", label: "Status" },
  { key: "category_id", type: "string", label: "Category ID" },
] as const;

export const articleSample = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  title: "Getting started",
  status: "published",
  category_id: "c1b2c3d4-0000-4000-8000-000000000002",
};

const PAGING_KEYS = ["page", "pageSize", "cursor", "includeTotalCount"];

/** The action's params without its paging block: a snapshot pages by itself, so those are dead UI. */
export function withoutPaging(params: Param[] | undefined): Param[] {
  return (params ?? []).filter((p) => !PAGING_KEYS.includes(p.key));
}

/** Every node of a tree list, depth first, with the nested children key removed from each row. */
function flattenTree(
  rows: Array<Record<string, unknown>>,
  childrenKey: string | undefined,
): Array<Record<string, unknown>> {
  if (!childrenKey) return rows;
  const out: Array<Record<string, unknown>> = [];
  const walk = (nodes: Array<Record<string, unknown>>) => {
    for (const node of nodes) {
      const { [childrenKey]: children, ...row } = node;
      out.push(row);
      if (Array.isArray(children)) walk(children as Array<Record<string, unknown>>);
    }
  };
  walk(rows);
  return out;
}

/**
 * Snapshot a small, complete collection through its existing list action. `childrenKey` names the
 * nested array of a tree list (Drive folders, categories): every node at every depth is one row.
 */
export function boundedListSnapshot(
  spec: Pick<TriggerDefinition, "key" | "title" | "description" | "output" | "sample"> & {
    action: ActionDefinition;
    params?: Param[];
    input: (params: Record<string, unknown>) => Record<string, unknown>;
    maxPages?: number;
    childrenKey?: string;
  },
): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: withoutPaging(spec.params),
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const items: Array<Record<string, unknown>> = [];
      const maxPages = spec.maxPages ?? MAX_PAGES;
      const {
        page: _page,
        pageSize: _pageSize,
        cursor: _cursor,
        includeTotalCount: _total,
        ...input
      } = spec.input(params as Record<string, unknown>);
      for (let page = 1; page <= maxPages; page++) {
        const result = await spec.action.execute(
          { ...input, page, pageSize: PAGE_SIZE },
          ctx,
        ) as { items?: Array<Record<string, unknown>>; pagination?: { has_more?: boolean } | null };
        items.push(...(result.items ?? []));
        if (!result.pagination?.has_more) break;
        if (page === maxPages) {
          throw new Error(`${spec.key} has more than ${maxPages * PAGE_SIZE} records`);
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true },
        rows: flattenTree(items, spec.childrenKey).map((item) => ({
          key: String(item.id ?? ""),
          values: item,
        })),
      });
      return { events: events.map((event) => event.values), nextState };
    },
  };
}
