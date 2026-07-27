import type { ActionDefinition } from "@w6w/types";
import { WooCommerceClient } from "../lib/client.ts";

interface Input {
  search?: string;
  email?: string;
  role?: string;
  orderBy?: string;
  order?: "asc" | "desc";
  perPage?: number;
  page?: number;
}

const customerGetMany: ActionDefinition<Input> = {
  key: "customer-get-many",
  type: "read",
  resource: "customer",
  title: "List Customers",
  description: "List customers on a single page. Set `page` to walk further pages.",
  params: [
    { key: "search", label: "Search", type: "string" },
    { key: "email", label: "Email", type: "string", hint: "Limit to customers with this email." },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "administrator", label: "Administrator" },
        { value: "editor", label: "Editor" },
        { value: "author", label: "Author" },
        { value: "contributor", label: "Contributor" },
        { value: "subscriber", label: "Subscriber" },
        { value: "customer", label: "Customer" },
        { value: "shop_manager", label: "Shop Manager" },
      ],
    },
    {
      key: "orderBy",
      label: "Order By",
      type: "select",
      options: [
        { value: "id", label: "ID" },
        { value: "include", label: "Include" },
        { value: "name", label: "Name" },
        { value: "registered_date", label: "Registered Date" },
      ],
      default: "id",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "ASC" },
        { value: "desc", label: "DESC" },
      ],
      default: "asc",
    },
    { key: "perPage", label: "Per Page", type: "number", default: 10 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "items", type: "array", label: "Customers" },
  ],

  execute(input, ctx) {
    const client = WooCommerceClient.fromConnection(ctx);
    return client.request("/customers", {
      query: {
        search: input.search,
        email: input.email,
        role: input.role,
        orderby: input.orderBy,
        order: input.order,
        per_page: input.perPage ?? 10,
        page: input.page ?? 1,
      },
    });
  },
};

export default customerGetMany;
