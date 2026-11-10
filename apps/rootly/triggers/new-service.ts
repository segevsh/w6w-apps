import { pollFromListAction } from "../../_shared/poll/mod.ts";
import serviceList from "../actions/service-list.ts";

/** `GET /v1/services` with `sort=-created_at` returns the newest records first (the same `sort` the action takes). */
export default pollFromListAction({
  key: "new-service",
  title: "New Service",
  description: "The run gets each newly created service in the catalog.",
  action: serviceList,
  input: () => ({ sort: "-created_at", page_number: 1, page_size: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string }).id) + "",
  output: [
    { key: "id", type: "string", label: "Service ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "svc_1",
    type: "services",
    name: "Checkout",
    slug: "checkout",
    created_at: "2026-11-10T09:00:00Z",
  },
  maxPages: 1,
});
