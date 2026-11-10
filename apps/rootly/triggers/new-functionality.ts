import { pollFromListAction } from "../../_shared/poll/mod.ts";
import functionalityList from "../actions/functionality-list.ts";

/** `GET /v1/functionalities` with `sort=-created_at` returns the newest records first (the same `sort` the action takes). */
export default pollFromListAction({
  key: "new-functionality",
  title: "New Functionality",
  description: "The run gets each newly created functionality.",
  action: functionalityList,
  input: () => ({ sort: "-created_at", page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string }).id) + "",
  output: [
    { key: "id", type: "string", label: "Functionality ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "fn_1",
    type: "functionalities",
    name: "Login",
    slug: "login",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
