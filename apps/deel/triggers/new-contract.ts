import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contractList from "../actions/contract-list.ts";

export default pollFromListAction({
  key: "new-contract",
  title: "New Contract",
  description: "The run gets each newly created contract.",
  action: contractList,
  input: () => ({ limit: 100, orderDirection: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Contract ID" }],
  sample: { id: "contract-1" },
  maxPages: 1,
});
