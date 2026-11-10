import { pollFromListAction } from "../../_shared/poll/mod.ts";
import jobList from "../actions/job-list.ts";

export default pollFromListAction({
  key: "new-job",
  title: "New Job",
  description: "The run gets each newly created job.",
  action: jobList,
  input: () => ({ orderBy: "id", orderDirection: "desc", limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Job ID" }, {
    key: "title",
    type: "string",
    label: "Title",
  }],
  sample: { id: "7", title: "Website rebuild" },
  maxPages: 1,
});
