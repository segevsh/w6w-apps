import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  filter?: string;
  sortBy?: string;
  customerNumber?: string;
  name?: string;
  zipCode?: string;
  city?: string;
  email?: string;
  phone?: string;
  organisationNumber?: string;
  lastModified?: string;
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "List customers sorted by customer number, with Fortnox's own filters.",
  params: [
    {
      "key": "page",
      "label": "Page",
      "type": "number",
      "hint": "Page number, starting at 1. Totals are in MetaInformation of the response.",
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Records per page: 1 to 500 (Fortnox default 100).",
    },
    {
      "key": "filter",
      "label": "Status filter",
      "type": "select",
      "options": [
        {
          "value": "active",
          "label": "active",
        },
        {
          "value": "inactive",
          "label": "inactive",
        },
      ],
    },
    {
      "key": "sortBy",
      "label": "Sort by",
      "type": "select",
      "options": [
        {
          "value": "customernumber",
          "label": "customernumber",
        },
        {
          "value": "name",
          "label": "name",
        },
      ],
    },
    {
      "key": "customerNumber",
      "label": "Customer number",
      "type": "string",
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "zipCode",
      "label": "Zip code",
      "type": "string",
    },
    {
      "key": "city",
      "label": "City",
      "type": "string",
    },
    {
      "key": "email",
      "label": "Email",
      "type": "string",
    },
    {
      "key": "phone",
      "label": "Phone",
      "type": "string",
    },
    {
      "key": "organisationNumber",
      "label": "Organisation number",
      "type": "string",
    },
    {
      "key": "lastModified",
      "label": "Last modified since",
      "type": "string",
      "hint": "Only records changed since this timestamp, e.g. 2026-10-01 or 2026-10-01 08:00.",
    },
  ],
  output: [
    {
      "key": "Customers",
      "type": "array",
      "label": "Customers",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/customers", {
      page: input.page,
      limit: input.limit,
      filter: input.filter,
      sortby: input.sortBy,
      customernumber: input.customerNumber,
      name: input.name,
      zipcode: input.zipCode,
      city: input.city,
      email: input.email,
      phone: input.phone,
      organisationnumber: input.organisationNumber,
      lastmodified: input.lastModified,
    });
  },
};

export default customerList;
