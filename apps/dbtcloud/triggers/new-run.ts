import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/run-list.ts";

export default pollFromListAction({
  key: "new-run",
  title: "New Run",
  description: "The run gets each newly created dbt Cloud run.",
  action,
  input: (params) => ({ ...params, returnAll: false, orderBy: "-id", limit: 100 }),
  items: (result) => (result as { runs?: unknown[] }).runs ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  params: action.params,
  output: [{ key: "id", type: "number", label: "Run ID" }],
  sample: { id: 123, status: 10, statusName: "Success" },
  maxPages: 1,
});
