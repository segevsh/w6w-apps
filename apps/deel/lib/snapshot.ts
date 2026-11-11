import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

export interface SnapshotSpec<P> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** The app's own list action; the poll runs the SAME request through its `execute`. */
  // deno-lint-ignore no-explicit-any
  action?: ActionDefinition<any>;
  /**
   * Reads the whole collection with the paging the vendor documents, for endpoints whose list
   * action pages differently (the action stays untouched). Takes precedence over `action`.
   */
  list?(params: P, ctx: HookContext): Promise<unknown>;
  /** The action's input; `returnAll` is forced on so the whole collection is read. */
  input?(params: P): Record<string, unknown>;
  /** When set, a changed stamp (e.g. `updated_at`) re-emits the record: the new-or-updated shape. */
  stampOf?(item: Record<string, unknown>): string;
}

/**
 * Snapshot poll over a bounded Deel collection (brief 9.1 c): the action is run with
 * `returnAll` (it follows Deel's cursor/offset 100 rows at a time), ids are diffed with `pollSnapshot`.
 * Added only, or added + updated when `stampOf` is given. The first check emits nothing; more than
 * 5000 rows makes the kit throw, naming the cap.
 */
export function snapshotList<P = Record<string, unknown>>(
  spec: SnapshotSpec<P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx: HookContext) {
      const res = spec.list ? await spec.list(params, ctx) : await spec.action!.execute(
        { ...(spec.input?.(params) ?? {}), returnAll: true },
        ctx,
      ) as unknown;
      // The list actions return the rows array itself (they page through Deel's cursor/offset).
      const items = (Array.isArray(res) ? res : []) as Array<Record<string, unknown>>;
      const byId = new Map<string, Record<string, unknown>>();
      for (const item of items) byId.set(String(item.id), item);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId].map(([key, item]) => ({
          key,
          values: spec.stampOf ? { stamp: spec.stampOf(item) } : { id: key },
        })),
        emit: { added: true, updated: spec.stampOf !== undefined },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
