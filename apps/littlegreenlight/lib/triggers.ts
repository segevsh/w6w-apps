import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

const PAGE_SIZE = 100;
/** 50 pages of 100 = the kit's 5000-row snapshot ceiling; a larger collection fails the check loudly. */
const MAX_PAGES = 50;

interface Envelope {
  items?: Array<Record<string, unknown>>;
  total_items?: number;
}

/**
 * A "New <record>" trigger over an LGL `limit`/`offset` index that has no `sort` or date filter
 * (appeals, campaigns, funds, groups, or one constituent's notes). Each check reads the whole
 * collection (`total_items` says when to stop, 100 per page) and a new `id` is a new record
 * (`pollSnapshot`, added only). The collections are small account lists, far below the 5000-row cap.
 */
export function newRecordTrigger(spec: {
  key: string;
  title: string;
  description: string;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  /** Required parent id params (a constituent); none for an account list. */
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    ...(spec.params ? { params: spec.params } : {}),
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const byKey = new Map<string, Record<string, unknown>>();
      let offset = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await spec.action.execute(
          { ...(params ?? {}), limit: PAGE_SIZE, offset },
          ctx,
        ) as Envelope;
        const rows = res.items ?? [];
        for (const row of rows) {
          if (row.id !== undefined) byKey.set(String(row.id), row);
        }
        offset += rows.length;
        if (rows.length === 0 || offset >= (res.total_items ?? 0)) break;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byKey.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
        maxRows: 5000,
      });
      return { events: events.map((e) => byKey.get(e.key)), nextState };
    },
  };
}
