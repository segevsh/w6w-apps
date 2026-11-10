import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

export default pollFromListAction({
  key: "new-or-updated-customer",
  title: "New or Updated Customer",
  description: "The run gets each created or edited customer.",
  action: customerList as never,
  params: [{ key: "businessId", label: "Business ID", type: "string", required: true }],
  input: (p: { businessId?: string }) => ({
    businessId: p.businessId,
    page: 1,
    pageSize: 100,
    sortKey: "MODIFIED_AT",
    sortDirection: "DESC",
  }),
  items: (r) => (r as { edges?: Array<{ node?: unknown }> }).edges?.map((e) => e.node) ?? [],
  idOf: (i) => {
    const x = i as { id?: unknown; modifiedAt?: unknown };
    return `${String(x.id ?? "")}:${String(x.modifiedAt ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Customer ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});
