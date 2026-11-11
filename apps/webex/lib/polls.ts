import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * Bounded-snapshot poll over one of the app's own list actions (`pollSnapshot`, emit `added` only).
 *
 * The list actions return ONE page (`{items}`; Webex pages through a `Link` header the client does
 * not follow), and Webex silently clamps `max` to what an endpoint allows
 * (https://developer.webex.com/docs/basics#pagination , verified 2026-11-10). A page that comes back
 * with `cap` rows or more may therefore be cut short, and a snapshot of a cut-short page would
 * report rows drifting in and out of it as new ones. So such a check THROWS (a failed check the
 * user sees) instead of emitting; fewer than `cap` rows is a complete collection.
 */
export interface SnapshotSpec<P, I> {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<I>;
  /** The literal action input for these params; must set `max` to `cap`. */
  input(params: P): I;
  /** Rows at or above this count are treated as a possibly truncated page. */
  cap: number;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}

export function snapshotTrigger<I, P = Record<string, unknown>>(
  spec: SnapshotSpec<P, I>,
): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const result = await spec.action.execute(spec.input((params ?? {}) as P), ctx);
      const items = (Array.isArray(result) ? result : []) as Array<Record<string, unknown>>;
      if (items.length >= spec.cap) {
        throw new Error(
          `${spec.title}: Webex returned ${items.length} rows, a full page of ${spec.cap}, so the list may be cut short and cannot be tracked reliably. Narrow it or use a webhook trigger.`,
        );
      }
      const rows = items.filter((i) => typeof i?.id === "string" && i.id !== "").map((i) => ({
        key: String(i.id),
        values: i,
      }));
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false, removed: false },
        maxRows: spec.cap,
      });
      return { events: events.map((c) => c.values), nextState };
    },
  };
}
