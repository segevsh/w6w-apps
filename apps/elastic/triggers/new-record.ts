import { pollFromListAction } from "../../_shared/poll/mod.ts";
import search from "../actions/search.ts";

export default pollFromListAction<{ index?: string; timestampField?: string }>({
  key: "new-record",
  title: "New Record",
  description: "The run gets each newly indexed record in the selected index.",
  action: search as never,
  input: (params) => ({
    index: params.index,
    query: { query: { match_all: {} } },
    size: 100,
    from: 0,
    sort: [{ [params.timestampField ?? "@timestamp"]: "desc" }],
  }),
  params: [
    { key: "index", label: "Index", type: "string", required: true },
    {
      key: "timestampField",
      label: "Creation timestamp field",
      type: "string",
      default: "@timestamp",
    },
  ],
  items: (result) =>
    Array.isArray((result as { hits?: { hits?: unknown[] } }).hits?.hits)
      ? (result as { hits: { hits: unknown[] } }).hits.hits
      : [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [{ key: "_id", type: "string", label: "Document ID" }],
  sample: { _id: "document-1" },
  maxPages: 1,
});
