import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

/**
 * `GET` list with `sort_by=created_at&sort_direction=DESC`: newest created first
 * (https://developers.salesloft.com/docs/api, sort_by / sort_direction on the list endpoint).
 */
export default pollFromListAction({
  key: "new-call",
  title: "New Call",
  description: "The run gets each newly logged call.",
  action: callList,
  input: () => ({ sortBy: "created_at", sortDirection: "DESC", page: 1, perPage: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Call ID" },
    { key: "disposition", type: "string", label: "Disposition" },
    { key: "sentiment", type: "string", label: "Sentiment" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 3301,
    disposition: "Connected",
    sentiment: "Positive",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
