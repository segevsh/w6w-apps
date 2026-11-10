import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

type Params = Record<string, unknown>;
type Item = Record<string, unknown>;

/** The kit's snapshot ceiling; a walk that reaches it fails loudly instead of missing records. */
export const MAX_ROWS = 5000;
export const PAGE_SIZE = 100;
/** 5000 rows / 100 per page, plus one page to prove the cap was crossed. */
const MAX_PAGES = MAX_ROWS / PAGE_SIZE + 1;

/** The organization every per-organization list hangs off. */
export const ORGANIZATION_ID_PARAM: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "number",
  required: true,
  hint: "The Hubstaff organization to watch, from List Organizations.",
};

/**
 * Cursor-walk snapshot feed (brief 9.1 c). Hubstaff's list endpoints take `page_limit` and
 * `page_start_id` and answer `pagination.next_page_start_id` (null on the last page); none documents
 * a sort or a created-after filter (https://api.hubstaff.com/v2/docs), so each check walks the whole
 * collection through the wrapped action — the SAME `execute`, client and auth — and diffs the ids
 * with `pollSnapshot`. The first check records the ids and emits nothing. A collection past the
 * kit's 5000-record ceiling throws instead of silently dropping records.
 */
export function snapshotFeed(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** The action input for one page; `cursor` is `undefined` on the first page. */
  input(o: { params: Params; cursor: number | undefined; pageSize: number }): Params;
  /** The list under the response's resource key. */
  items(result: unknown): Item[];
  idOf(item: Item): string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const run = spec.action.execute as unknown as (i: Params, c: HookContext) => Promise<unknown>;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx: HookContext) {
      const rows = new Map<string, { key: string; values: unknown }>();
      let cursor: number | undefined;
      for (let page = 0;; page++) {
        if (page >= MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${MAX_ROWS} records; the snapshot trigger cannot cover it`,
          );
        }
        const result = await run(
          spec.input({ params: params as Params, cursor, pageSize: PAGE_SIZE }),
          ctx,
        );
        for (const item of spec.items(result)) {
          const key = spec.idOf(item);
          if (key && !rows.has(key)) rows.set(key, { key, values: item });
        }
        const next = (result as { pagination?: { next_page_start_id?: number | null } })
          .pagination?.next_page_start_id;
        if (next === undefined || next === null) break;
        cursor = next;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...rows.values()],
        emit: { added: true, updated: false },
        maxRows: MAX_ROWS,
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
