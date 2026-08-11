import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, toList } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/customers/addresses` — customer addresses, store-wide.
 *
 * Addressed at the top level and filtered by `customer_id:in`, not nested under
 * a customer — so one call fetches the addresses of a whole batch of customers,
 * which is the shape a sync actually wants.
 */
interface Input {
  customerIds?: string;
  ids?: string;
  companies?: string;
  names?: string;
  includeFormFields?: boolean;
  limit?: number;
  page?: number;
}

const customerAddressList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "customer-address-list",
  type: "search",
  resource: "customer",
  title: "List Customer Addresses",
  description: "Customer addresses across the store, filtered by customer, id, company or name.",
  params: [
    {
      key: "customerIds",
      label: "Customer IDs",
      type: "string",
      placeholder: "12,13",
      hint: "Comma-separated. Sent as `customer_id:in`.",
    },
    { key: "ids", label: "Address IDs", type: "string", hint: "Comma-separated. Sent as `id:in`." },
    { key: "companies", label: "Companies", type: "string", advanced: true },
    { key: "names", label: "Names", type: "string", advanced: true },
    {
      key: "includeFormFields",
      label: "Include form fields",
      type: "boolean",
      hint: "`formfields` is the only value this endpoint's `include` accepts.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Addresses" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/customers/addresses", {
      query: {
        "customer_id:in": toList(input.customerIds),
        "id:in": toList(input.ids),
        "company:in": toList(input.companies),
        "name:in": toList(input.names),
        include: input.includeFormFields ? "formfields" : undefined,
        limit: input.limit,
        page: input.page,
      },
    });
  },
};

export default customerAddressList;
