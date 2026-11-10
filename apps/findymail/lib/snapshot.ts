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
  action: ActionDefinition<any>;
  input?(params: P): Record<string, unknown>;
  /** The rows of the action's result. */
  rows(result: Record<string, unknown>): Array<Record<string, unknown>>;
}

/**
 * Snapshot poll over a small bounded Findymail collection (brief 9.1 c): the list comes back in
 * one unpaginated response, ids are diffed with `pollSnapshot`, added only. The first check emits
 * nothing; more than 5000 rows makes the kit throw, naming the cap.
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
      const res = await spec.action.execute(spec.input?.(params) ?? {}, ctx) as Record<
        string,
        unknown
      >;
      const byId = new Map<string, Record<string, unknown>>();
      for (const item of spec.rows(res)) byId.set(String(item.id), item);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
