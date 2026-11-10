import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * Bounded-snapshot poll over one of the app's own cursor-paginated list actions.
 *
 * Each check runs the action with `returnAll` (up to six pages of `limit=1000`, so a request is
 * `GET <path>?limit=1000`), diffs the rows against the previous check and emits only additions. The
 * first check only records what exists. An account holding more than `pollSnapshot`'s 5000 rows
 * (six full pages are 6000) fails the check with an error naming the cap, so a long list is never
 * silently cut short.
 */
export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  /** The array in the action's result that holds the rows (`destinations`, `users`, …). */
  listKey: string;
  output: OutputField[];
  sample: unknown;
}

export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const out = await spec.action.execute({ returnAll: true, maxPages: 6 }, ctx) as Record<
        string,
        unknown
      >;
      const list = out?.[spec.listKey];
      const rows = (Array.isArray(list) ? list : []) as Array<Record<string, unknown>>;
      const { events, nextState } = await pollSnapshot({
        state,
        rows: rows.filter((r) => typeof r?.id === "string" && r.id !== "").map((r) => ({
          key: String(r.id),
          values: r,
        })),
        emit: { added: true, updated: false, removed: false },
        maxRows: 5000,
      });
      return { events: events.map((c) => c.values), nextState };
    },
  };
}
