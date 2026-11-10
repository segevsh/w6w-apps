import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

const PAGE_SIZE = 100;
/** 50 pages of 100 = the kit's 5000-row snapshot ceiling; a larger collection fails the check loudly. */
const MAX_PAGES = 50;

interface Page {
  data?: Array<Record<string, unknown>>;
  pagination?: { page?: number; pages?: number } | null;
}

/**
 * A "New <record>" trigger over a Leexi `page`/`items` list whose workspace-level collection is
 * small (users, teams, client companies, or one company's teams/users): every page is read
 * (`pagination.pages`, 100 per page) and a new `uuid` is a new record (`pollSnapshot`, added only).
 */
export function newRecordTrigger(spec: {
  key: string;
  title: string;
  description: string;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  /** Required parent id params (a client company); none for a workspace list. */
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
      for (let page = 1; page <= MAX_PAGES; page++) {
        const res = await spec.action.execute(
          { ...(params ?? {}), page, items: PAGE_SIZE },
          ctx,
        ) as Page;
        const rows = res.data ?? [];
        for (const row of rows) {
          if (row.uuid !== undefined) byKey.set(String(row.uuid), row);
        }
        if (rows.length === 0 || page >= (res.pagination?.pages ?? 1)) break;
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
