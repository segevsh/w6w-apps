import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

/**
 * A "New <task>" trigger over a Linkup task list. The vendor documents `sortBy=createdAt` and
 * `sortDirection=desc` (https://api.linkup.so/v1/openapi.json), so page 1 is the newest tasks.
 */
export function newTaskTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<Record<string, unknown>>;
  idLabel: string;
}) {
  return pollFromListAction({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    input: () => ({ sortBy: "createdAt", sortDirection: "desc", pageSize: 100 }),
    items: (result) => (result as { items?: unknown[] }).items ?? [],
    idOf: (item) => String((item as { id?: unknown }).id ?? ""),
    output: [
      { key: "id", type: "string", label: spec.idLabel },
      { key: "status", type: "string", label: "Status" },
      { key: "createdAt", type: "string", label: "Created at" },
    ],
    sample: { id: "tsk_123", status: "pending", createdAt: "2026-11-09T12:00:00.000Z" },
    maxPages: 1,
  });
}
