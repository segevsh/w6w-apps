import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each newly created customer.",
  action: customerList as never,
  params: [{ key: "businessId", label: "Business ID", type: "string", required: true }],
  input: (p: { businessId?: string }) => ({
    businessId: p.businessId,
    page: 1,
    pageSize: 100,
    sortKey: "CREATED_AT",
    sortDirection: "DESC",
  }),
  items: (r) => (r as { edges?: Array<{ node?: unknown }> }).edges?.map((e) => e.node) ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Customer ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});
