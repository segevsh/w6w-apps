import type { ActionDefinition } from "@w6w/types";
import alertList from "../actions/alert-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/** `GET /v1/alerts` takes `filter[updated_at][gte]`; an edited alert gets a new `updated_at`. */
export default sinceTrigger({
  key: "new-or-updated-alert",
  title: "New or Updated Alert",
  description: "The run gets each alert when it is created or changed (status, notes, grouping).",
  action: alertList as unknown as ActionDefinition,
  pageSize: 100,
  input: ({ since }) => ({ updated_at_gte: since, page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  nextPageInput: (input, result) => {
    const next = (result as { meta?: { next_page?: number | null } | null }).meta?.next_page;
    return typeof next === "number" ? { ...input, page_number: next } : undefined;
  },
  idOf: (item) => {
    const a = item as { id?: unknown; updated_at?: unknown };
    return `${String(a.id ?? "")}:${String(a.updated_at ?? "")}`;
  },
  stampOf: (item) => (item as { updated_at?: unknown }).updated_at,
  output: [
    { key: "id", type: "string", label: "Alert ID" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "status", type: "string", label: "Status" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "alr_1",
    type: "alerts",
    summary: "High error rate on checkout",
    status: "acknowledged",
    updated_at: "2026-11-10T09:30:00Z",
  },
});
