import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import resultList from "../actions/result-list.ts";
import { formDir } from "../lib/params.ts";

type Item = Record<string, unknown>;

export default pollFromListAction<Record<string, unknown>>({
  key: "new-result",
  title: "New Result",
  description:
    "The run gets each newly submitted result of the chosen Formsite form, oldest first.",
  action: resultList as unknown as ActionDefinition,
  params: [formDir],
  input: (params) => ({
    ...(params as Record<string, unknown>),
    limit: 100,
    page: 1,
    sortDirection: "desc",
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => {
    const i = item as Item;
    return String(i.id ?? "");
  },
  output: [
    { key: "id", type: "string", label: "Result ID" },
    { key: "result_status", type: "string", label: "Status" },
    { key: "date_start", type: "string", label: "Started" },
    { key: "date_finish", type: "string", label: "Finished" },
    { key: "date_update", type: "string", label: "Last updated" },
  ],
  sample: {
    id: "1042",
    result_status: "Complete",
    date_start: "2026-11-09T10:00:00Z",
    date_finish: "2026-11-09T10:02:00Z",
    date_update: "2026-11-09T10:02:00Z",
  },
  maxPages: 1,
});
