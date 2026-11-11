import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * Shape (c) for JumpCloud collections that document no sort order and no creation stamp
 * (command, device/user groups, organizations, group membership, SSH keys): the check reads the
 * whole collection through the existing list action (`returnAll`, 100 per page — JumpCloud's cap)
 * and emits only the keys added since the last check. `pollSnapshot` throws past 5000 rows.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  input?: (params: Record<string, unknown>) => Record<string, unknown>;
  idOf: (item: Record<string, unknown>) => unknown;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    async poll({ state, params }, ctx) {
      const input = { ...(spec.input?.(params as Record<string, unknown>) ?? {}), returnAll: true };
      const result = await spec.action.execute(input, ctx);
      const items = (Array.isArray(result) ? result : []) as Array<Record<string, unknown>>;
      const rows = items
        .map((item) => ({ key: String(spec.idOf(item) ?? ""), values: item }))
        .filter((r) => r.key !== "");
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
