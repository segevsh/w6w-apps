import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * A list the vendor returns whole in one request (no cursor, no sort): `agent.list`,
 * `project.list`, `connector.list`, `skill.list`. Each check reads it through the action's own
 * `execute` and diffs the ids against the last check; added rows only. More than 5000 rows throws.
 */
export function wholeListSnapshot(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params?: Param[];
  input?: (params: Record<string, unknown>) => Record<string, unknown>;
  idOf?: (item: unknown) => string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const idOf = o.idOf ?? ((item: unknown) => String((item as { id?: unknown }).id ?? ""));
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    minIntervalMs: 300_000,
    ...(o.params ? { params: o.params } : {}),
    output: o.output,
    sample: o.sample,
    async poll({ params, state }, ctx) {
      const items = await o.action.execute!(
        o.input?.(params as Record<string, unknown>) ?? {},
        ctx,
      );
      const rows = new Map<string, unknown>();
      for (const item of Array.isArray(items) ? items : []) rows.set(idOf(item), item);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...rows].map(([key, values]) => ({ key, values })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
