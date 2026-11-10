import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

/** Builds a one-page Podium poll through the existing action and its client. */
export function recordTrigger(spec: {
  key: string;
  title: string;
  action: ActionDefinition<never>;
  items: (result: unknown) => unknown[];
}): TriggerDefinition {
  const { action, ...details } = spec;
  return pollFromListAction<Record<string, unknown>>({
    ...details,
    action: action as unknown as ActionDefinition,
    params: action.params,
    description: `The run gets each newly listed ${spec.title.toLowerCase()}.`,
    input: (params) => ({ ...params, cursor: undefined, limit: 100, order: "desc" }),
    idOf: (item) =>
      String((item as { uid?: unknown; id?: unknown }).uid ?? (item as { id?: unknown }).id ?? ""),
    output: [{ key: "uid", type: "string", label: "Podium record UID" }],
    sample: { uid: "record-1" },
    maxPages: 1,
  });
}
