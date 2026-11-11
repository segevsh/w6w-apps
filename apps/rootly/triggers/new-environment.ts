import { pollFromListAction } from "../../_shared/poll/mod.ts";
import environmentList from "../actions/environment-list.ts";

/** `GET /v1/environments` with `sort=-created_at` returns the newest records first (the same `sort` the action takes). */
export default pollFromListAction({
  key: "new-environment",
  title: "New Environment",
  description: "The run gets each newly created environment.",
  action: environmentList,
  input: () => ({ sort: "-created_at", page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string }).id) + "",
  output: [
    { key: "id", type: "string", label: "Environment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "env_1",
    type: "environments",
    name: "Staging",
    slug: "staging",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
