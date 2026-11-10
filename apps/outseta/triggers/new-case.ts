import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listCases from "../actions/list-cases.ts";

export default pollFromListAction({
  key: "new-case",
  title: "New Support Case",
  description: "The run gets each newly opened Outseta support case (newest first).",
  action: listCases,
  input: () => ({ limit: 25, orderBy: "Created DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { Uid?: unknown }).Uid ?? ""),
  output: [
    { key: "Uid", type: "string", label: "Case Uid" },
    { key: "Title", type: "string", label: "Title" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: {
    Uid: "c4Tz7YhB",
    Title: "Cannot log in",
    Created: "2026-11-09T09:00:00Z",
  },
  maxPages: 1,
});
