import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listFormSubmissions from "../actions/list-form-submissions.ts";
import { slugOrIdParam } from "../lib/params.ts";

export default pollFromListAction<{ slugOrId: string }>({
  key: "new-submission",
  title: "New Form Submission",
  description: "The run gets each new completed submission of the chosen Paperform form.",
  action: listFormSubmissions as unknown as ActionDefinition,
  params: [slugOrIdParam],
  input: (params) => ({ slugOrId: params.slugOrId, limit: 20, sort: "DESC" }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Submission ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "data", type: "object", label: "Answers keyed by field key" },
  ],
  sample: {
    id: "6501f0c2a8b1d",
    created_at: "2026-11-09 09:00:00",
    data: { email: "ada@example.com" },
  },
  maxPages: 1,
});
