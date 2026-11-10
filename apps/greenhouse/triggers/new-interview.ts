import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listInterviews from "../actions/list-interviews.ts";

export default pollFromListAction({
  key: "new-interview",
  title: "New Interview",
  description: "The run gets each newly scheduled interview.",
  action: listInterviews,
  input: () => ({ perPage: 100 }),
  items: (result) => Array.isArray(result) ? result : (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Interview ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
