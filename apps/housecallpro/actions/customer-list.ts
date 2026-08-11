import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList, toList } from "../lib/client.ts";
import { companyIdParam, listOutput, paginationParams, sortDirectionParam } from "../lib/params.ts";

/**
 * `GET /customers` — search the customer book.
 *
 * `q` is the only free-text filter and the reference says exactly what it spans:
 * "name, email, mobile number and address". There is no separate email or phone
 * parameter, so a lookup by email is this action with `q` set to the address.
 */
interface Input {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  expand?: string[] | string;
  companyId?: string;
}

const customerList: ActionDefinition<Input, NormalizedList> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "Find Customers",
  description: "Search customers by name, email, mobile number or address.",
  params: [
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Matches a customer's name, email, mobile number or address.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      default: "created_at",
      hint:
        "A customer attribute. The reference documents the default (`created_at`) but publishes " +
        "no list of accepted values.",
    },
    sortDirectionParam,
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: [
        { value: "attachments", label: "Attachments" },
        { value: "do_not_service", label: "Do-not-service flag" },
      ],
      hint: "Both fields are absent from the response unless expanded.",
    },
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Customers"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/customers", "customers", {
      companyId: input.companyId,
      query: {
        q: input.q,
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
        expand: toList(input.expand),
      },
    });
  },
};

export default customerList;
