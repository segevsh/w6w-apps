import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import customerList from "../actions/customer-list.ts";

/**
 * `POST /v1/api/customers` takes `sort` ("Field name used for sorting", example `id`) and `order`
 * (`asc`/`desc`) on every search request (OpenAPI `BaseSearchRequestWithLimitedPageSize`), and
 * pages from 0 with a maximum `pageSize` of 100: newest id first, page 0.
 * https://app.agencyzoom.com/openapi/agencyzoom.yaml
 */
export default pollFromListAction<Record<string, never>>({
  key: "new-customer",
  title: "New Customer",
  description: "The run gets each new customer in the agency.",
  action: customerList as unknown as ActionDefinition,
  input: () => ({ sort: "id", order: "desc", page: 0, pageSize: 100 }),
  items: (result) => (result as { customers?: unknown[] }).customers ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "phone", type: "string", label: "Phone" },
  ],
  sample: {
    id: 501,
    firstname: "Ada",
    lastname: "Lovelace",
    email: "ada@example.com",
    phone: "5551230000",
  },
  maxPages: 1,
});
