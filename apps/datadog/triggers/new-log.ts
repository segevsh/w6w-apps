import { pollFromListAction } from "../../_shared/poll/mod.ts";
import logSearch from "../actions/log-search.ts";

export default pollFromListAction<Record<string, unknown>>({
  key: "new-log",
  title: "New Log",
  description: "Emit new Datadog log events matching a search query.",
  action: logSearch,
  params: logSearch.params,
  input: (params) => ({
    ...params,
    query: String(params.query ?? "*"),
    sort: "-timestamp",
    limit: 100,
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Log event ID" }],
  sample: { id: "log_1" },
});
