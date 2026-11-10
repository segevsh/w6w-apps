import { pollFromListAction } from "../../_shared/poll/mod.ts";
import personnelList from "../actions/personnel-list.ts";

export default pollFromListAction({
  key: "new-personnel",
  title: "New Personnel",
  description: "The run gets each new personnel record.",
  action: personnelList,
  input: () => ({ size: 100, sort: "createdAt", sortDir: "DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Personnel ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
