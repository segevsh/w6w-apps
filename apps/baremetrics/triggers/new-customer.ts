import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import customerList from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer in the selected source.",
  action: customerList as unknown as ActionDefinition,
  params: [{ key: "sourceId", label: "Source ID", type: "string", required: true }],
  input: (params: { sourceId: string }) => ({
    source_id: params.sourceId,
    sort: "created",
    order: "desc",
    per_page: 100,
    page: 0,
  }),
  items: (result) => (result as { customers?: unknown[] }).customers ?? [],
  idOf: (item) =>
    String((item as { oid?: unknown; id?: unknown }).oid ?? (item as { id?: unknown }).id ?? ""),
  output: [{ key: "oid", type: "string", label: "Customer OID" }],
  sample: { oid: "customer-new" },
  maxPages: 1,
});
