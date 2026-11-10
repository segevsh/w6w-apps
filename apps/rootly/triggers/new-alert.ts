import type { ActionDefinition } from "@w6w/types";
import alertList from "../actions/alert-list.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/** `GET /v1/alerts` takes `filter[created_at][gte]` but no sort; each check asks a short window. */
export default sinceTrigger({
  key: "new-alert",
  title: "New Alert",
  description: "The run gets each newly created alert.",
  action: alertList as unknown as ActionDefinition,
  pageSize: 100,
  input: ({ since }) => ({ created_at_gte: since, page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  nextPageInput: (input, result) => {
    const next = (result as { meta?: { next_page?: number | null } | null }).meta?.next_page;
    return typeof next === "number" ? { ...input, page_number: next } : undefined;
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  stampOf: (item) => (item as { created_at?: unknown }).created_at,
  output: [
    { key: "id", type: "string", label: "Alert ID" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "status", type: "string", label: "Status" },
    { key: "source", type: "string", label: "Source" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "alr_1",
    type: "alerts",
    summary: "High error rate on checkout",
    status: "triggered",
    source: "datadog",
    created_at: "2026-11-10T09:00:00Z",
  },
});
