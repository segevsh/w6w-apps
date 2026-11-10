import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

const PAGE = 250;
const MAX_PAGES = 20;

/**
 * A poll trigger over a small, bounded BigCommerce collection (price lists, brands, inventory
 * locations): every check reads the whole collection and diffs per-row hashes (`pollSnapshot`).
 * `updated` also emits a row whose values changed. More than `PAGE * MAX_PAGES` rows throws.
 */
export function snapshotTrigger(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  idKey: string;
  updated: boolean;
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    minIntervalMs: 300_000,
    output: o.output,
    sample: o.sample,
    async poll({ state }, ctx) {
      const rows: Array<Record<string, unknown>> = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await o.action.execute({ limit: PAGE, page }, ctx) as {
          data?: Array<Record<string, unknown>>;
        };
        const data = Array.isArray(res.data) ? res.data : [];
        rows.push(...data);
        if (data.length < PAGE) break;
        if (page === MAX_PAGES) {
          throw new Error(`${o.key}: more than ${PAGE * MAX_PAGES} rows; cannot snapshot`);
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: rows.map((r) => ({ key: String(r[o.idKey] ?? ""), values: r })),
        emit: { added: true, updated: o.updated },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
