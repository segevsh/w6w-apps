import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;
type ListResult = { items?: Item[]; pagination?: { pageCount?: number | null } };

/** Float's largest page (`per-page` max 200) and the pages walked per snapshot check. */
const PER_PAGE = 200;
const MAX_PAGES = 25;

const itemsOf = (r: unknown): unknown[] => {
  const items = (r as ListResult | undefined)?.items;
  return Array.isArray(items) ? items : [];
};

/**
 * Newest-first: the list action's `sort` argument (`-created`, or `-modified` for the
 * new-or-updated sibling; "prefix `-` to apply descending",
 * https://developer.float.com/swagger-api-v3.yaml) with one 100-row page per check. With
 * `stampKey` the id includes that stamp, so an edit is a new event.
 */
export function newestFirstTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: unknown;
  sort: string;
  idKey: string;
  stampKey?: string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return pollFromListAction({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action as ActionDefinition,
    input: () => ({ page: 1, "per-page": 100, sort: spec.sort }),
    items: itemsOf,
    idOf: (item) => {
      const it = item as Item;
      const id = String(it[spec.idKey] ?? "");
      return spec.stampKey ? `${id}:${String(it[spec.stampKey] ?? "")}` : id;
    },
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  });
}

/**
 * A small collection with no sort argument (clients, milestones): every check walks the pages
 * (`per-page=200`, pages counted by the `X-Pagination-Page-Count` header) and diffs the ids
 * against the previous check (`pollSnapshot`, additions only; the first check records what exists
 * without firing). A collection longer than {@link MAX_PAGES} pages fails the check rather than
 * reporting a partial snapshot, which would later announce old records as new.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: unknown;
  idKey: string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const action = spec.action as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const byId = new Map<string, Item>();
      for (let page = 1;; page++) {
        const res = await action.execute({ page, "per-page": PER_PAGE }, ctx) as ListResult;
        for (const it of itemsOf(res) as Item[]) {
          const id = String(it[spec.idKey] ?? "");
          if (id) byId.set(id, it);
        }
        const total = Number(res.pagination?.pageCount ?? 1);
        if (page >= total) break;
        if (page >= MAX_PAGES) {
          throw new Error(`${spec.key}: more than ${MAX_PAGES} pages; refusing a partial snapshot`);
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key) as Item), nextState };
    },
  };
}
