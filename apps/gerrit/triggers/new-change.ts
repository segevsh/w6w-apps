import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import changeSearch from "../actions/change-search.ts";

type Item = Record<string, unknown>;

export default pollFromListAction<Record<string, unknown>>({
  key: "new-change",
  title: "New Change",
  description:
    "The run gets each newly created Gerrit change matching the query (default open changes), oldest first.",
  action: changeSearch as unknown as ActionDefinition,
  params: [{
    key: "q",
    label: "Query",
    type: "string",
    default: "status:open",
    hint: "Gerrit search syntax; results come back most recently updated first.",
  }],
  input: (params) => ({ ...(params as Record<string, unknown>), limit: 100 }),
  items: (result) => (result as { changes?: unknown[] }).changes ?? [],
  idOf: (item) => {
    const i = item as Item;
    return String(i._number ?? "");
  },
  output: [
    { key: "_number", type: "number", label: "Change number" },
    { key: "project", type: "string", label: "Project" },
    { key: "branch", type: "string", label: "Branch" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "created", type: "string", label: "Created" },
    { key: "updated", type: "string", label: "Updated" },
  ],
  sample: {
    _number: 4021,
    project: "platform",
    branch: "main",
    subject: "Fix retry loop",
    status: "NEW",
    created: "2026-11-09 10:00:00.000000000",
    updated: "2026-11-09 10:00:00.000000000",
  },
  maxPages: 1,
});
