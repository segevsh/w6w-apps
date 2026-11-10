import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;

/** Rows per request and the pages walked per check (a snapshot beyond the cap is refused). */
const LIMIT = 100;
const MAX_PAGES = 25;

/**
 * A bounded collection with no sort argument and no created filter (the account's listings, one
 * conversation's messages): every check walks `limit=100&offset=0,100,…` until a short page and
 * diffs the ids against the previous check (`pollSnapshot`, additions only; the first check
 * records what exists without firing). A collection longer than {@link MAX_PAGES} pages fails the
 * check rather than reporting a partial snapshot, which would later announce old records as new.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: unknown;
  params?: Param[];
  input(
    params: Record<string, unknown>,
    w: { limit: number; offset: number },
  ): Record<string, unknown>;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const action = spec.action as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const byId = new Map<string, Item>();
      for (let page = 0;; page++) {
        const res = await action.execute(
          spec.input(params, { limit: LIMIT, offset: page * LIMIT }),
          ctx,
        ) as { items?: Item[] };
        const items = Array.isArray(res.items) ? res.items : [];
        for (const it of items) {
          const id = String(it.id ?? "");
          if (id) byId.set(id, it);
        }
        if (items.length < LIMIT) break;
        if (page + 1 >= MAX_PAGES) {
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
