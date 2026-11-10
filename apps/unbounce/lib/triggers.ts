import type { ActionDefinition, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

/**
 * A "new <record>" poll over one of Unbounce's list actions. Every collection endpoint documents
 * `sort_order` (creation date, `asc` default), so the trigger asks for `desc` — newest first —
 * and `pollFromListAction` stops at the first page holding an id it has seen.
 * https://developer.unbounce.com/api_reference/
 */
export function newRecordTrigger<P>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  input: (params: P) => Record<string, unknown>;
  listKey: string;
  params: Param[];
  idLabel: string;
}): TriggerDefinition {
  return pollFromListAction<Record<string, unknown>>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    input: (params) => spec.input(params as P),
    items: (result) => (result as Record<string, unknown[] | undefined>)?.[spec.listKey] ?? [],
    idOf: (item) => String((item as { id: unknown }).id),
    params: spec.params,
    output: [
      { key: "id", type: "string", label: spec.idLabel },
      { key: "name", type: "string", label: "Name" },
    ],
    sample: { id: "1552433", name: "Default Client" },
    maxPages: 1,
  });
}
