import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

/** Builds a bounded poll over an Ashby list action using the action's own client. */
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
    input: (params) => ({ ...params, returnAll: true, maxPages: 1 }),
    idOf: (item) => String((item as { id?: unknown }).id ?? ""),
    output: [{ key: "id", type: "string", label: "Ashby record ID" }],
    sample: { id: "record-1" },
    maxPages: 1,
  });
}
