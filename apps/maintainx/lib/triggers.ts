import type { ActionDefinition, OutputField } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import workorderList from "../actions/workorder-list.ts";

/** Fields every work-order event carries (vendor OpenAPI `GET /workorders`, verified 2026-11-10). */
export const WORK_ORDER_OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Work order ID" },
  { key: "sequentialId", type: "number", label: "Sequential ID" },
  { key: "title", type: "string", label: "Title" },
  { key: "status", type: "string", label: "Status" },
  { key: "priority", type: "string", label: "Priority" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

export const WORK_ORDER_SAMPLE = {
  id: 1001,
  sequentialId: 42,
  title: "Replace conveyor belt",
  status: "OPEN",
  priority: "MEDIUM",
  createdAt: "2026-11-09T09:00:00.000Z",
  updatedAt: "2026-11-09T09:00:00.000Z",
};

/** `GET /workorders` newest-first by an explicit `sort` (`-createdAt` / `-updatedAt`). */
export function workOrderFeed(o: {
  key: string;
  title: string;
  description: string;
  sort: "-createdAt" | "-updatedAt";
  idOf(item: unknown): string;
}) {
  return pollFromListAction({
    key: o.key,
    title: o.title,
    description: o.description,
    action: workorderList as ActionDefinition,
    input: () => ({ sort: o.sort, limit: 100 }),
    items: (r) => (r as { workOrders?: unknown[] }).workOrders ?? [],
    idOf: o.idOf,
    output: WORK_ORDER_OUTPUT,
    sample: WORK_ORDER_SAMPLE,
    maxPages: 1,
  });
}
