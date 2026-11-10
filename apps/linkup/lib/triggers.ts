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
  /** §9.2: sort by `updatedAt` and fire again when a task's `updatedAt` moves. */
  updated?: boolean;
}) {
  return pollFromListAction({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    input: () => ({
      sortBy: spec.updated ? "updatedAt" : "createdAt",
      sortDirection: "desc",
      pageSize: 100,
    }),
    items: (result) => (result as { items?: unknown[] }).items ?? [],
    idOf: (item) => {
      const task = item as { id?: unknown; updatedAt?: unknown };
      const id = String(task.id ?? "");
      return spec.updated ? `${id}:${String(task.updatedAt ?? "")}` : id;
    },
    output: [
      { key: "id", type: "string", label: spec.idLabel },
      { key: "status", type: "string", label: "Status" },
      { key: "createdAt", type: "string", label: "Created at" },
      { key: "updatedAt", type: "string", label: "Updated at" },
    ],
    sample: {
      id: "tsk_123",
      status: "pending",
      createdAt: "2026-11-09T12:00:00.000Z",
      updatedAt: "2026-11-09T12:00:00.000Z",
    },
    nextPageInput: (input, result) => {
      const meta = (result as { metadata?: { page?: number; totalPages?: number } }).metadata;
      const page = Number(meta?.page);
      return Number.isFinite(page) && page < Number(meta?.totalPages)
        ? { ...input, page: page + 1 }
        : undefined;
    },
    // Newest-first, so a check walks up to 5 pages (500 tasks) and stops at the first page that
    // holds an already-seen id; nothing is re-read forever (no since window to drain).
    maxPages: 5,
  });
}
