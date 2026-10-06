import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
  supplierNumber?: string;
  name?: string;
  organisationNumber?: string;
  phone?: string;
  zipCode?: string;
  city?: string;
  email?: string;
  lastModified?: string;
}

const supplierList: ActionDefinition<Input> = {
  key: "supplier-list",
  type: "search",
  resource: "supplier",
  title: "List Suppliers",
  description: "List suppliers sorted by supplier number.",
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
      "key": "supplierNumber",
      "label": "Supplier number",
      "type": "string",
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "organisationNumber",
      "label": "Organisation number",
      "type": "string",
    },
    {
      "key": "phone",
      "label": "Phone",
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
      "key": "lastModified",
      "label": "Last modified since",
      "type": "string",
      "hint": "Only records changed since this timestamp, e.g. 2026-10-01 or 2026-10-01 08:00.",
    },
  ],
  output: [
    {
      "key": "Suppliers",
      "type": "array",
      "label": "Suppliers",
    },
    {
      "key": "MetaInformation",
      "type": "object",
      "label": "Paging totals (@TotalResources, @TotalPages, @CurrentPage)",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get("/3/suppliers", {
      page: input.page,
      limit: input.limit,
      suppliernumber: input.supplierNumber,
      name: input.name,
      organisationnumber: input.organisationNumber,
      phone: input.phone,
      zipcode: input.zipCode,
      city: input.city,
      email: input.email,
      lastmodified: input.lastModified,
    });
  },
};

export default supplierList;
