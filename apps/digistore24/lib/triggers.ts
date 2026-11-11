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

/** The kit's snapshot ceiling; a larger list throws instead of silently dropping records. */
const MAX_ROWS = 5000;

/**
 * Bounded-collection feed (brief 9.1 c) for Digistore24's un-paged lists. Each of those
 * functions answers the whole collection in one response (the OpenAPI paths under
 * `digistore24.com/api/docs/paths/` give them no paging parameters), so one check runs the
 * wrapped action once — the SAME `execute`, client and auth as the action — and diffs the ids with
 * `pollSnapshot`. The first check records the ids and emits nothing; later checks emit each new id.
 */
export function snapshotFeed(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** The action input for this subscription's params. */
  input?(params: Params): Params;
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
      const result = await run(spec.input ? spec.input(params as Params) : {}, ctx);
      const rows = new Map<string, { key: string; values: unknown }>();
      for (const item of spec.items(result)) {
        const key = spec.idOf(item);
        if (key && !rows.has(key)) rows.set(key, { key, values: item });
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
