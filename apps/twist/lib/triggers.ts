import type { ActionDefinition, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * Bounded snapshot poll (brief 9.1 c) over one of Twist's whole-collection list actions
 * (workspaces, channels, groups, workspace users): the endpoint takes no order and no limit and
 * answers with the entire collection, so each check reads it all and emits only records whose id
 * was not in the previous check (`added` only). More than 5000 records throws.
 */
export function collectionSnapshot(
  spec: Pick<TriggerDefinition, "key" | "title" | "description" | "output" | "sample"> & {
    action: ActionDefinition;
    params?: Param[];
    input: (params: Record<string, unknown>) => Record<string, unknown>;
  },
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
      const result = await spec.action.execute(spec.input(params as Record<string, unknown>), ctx);
      const items = (result as { items?: Array<Record<string, unknown>> }).items ?? [];
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true },
        rows: items.map((item) => ({ key: String(item.id ?? ""), values: item })),
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
