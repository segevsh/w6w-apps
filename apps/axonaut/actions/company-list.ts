import type { ActionDefinition } from "@w6w/types";
import { AxonautClient } from "../lib/client.ts";

/**
 * `GET /api/v2/companies` — List companies (customers, prospects and suppliers), optionally filtered.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  page?: number;
  search?: string;
  internal_id?: string;
  type?: string;
  siret?: string;
  address_city?: string;
  address_zipcode?: string;
  is_prospect?: boolean;
  is_customer?: boolean;
  is_supplier?: boolean;
  is_disabled?: boolean;
  sort?: string;
}

const companyList: ActionDefinition<Input> = {
  key: "company-list",
  type: "search",
  resource: "company",
  title: "List Companies",
  description: "List companies (customers, prospects and suppliers), optionally filtered.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint:
        "Page number, sent as the `page` header (1-based). The list ends at the first empty page.",
    },
    { key: "search", label: "Search", type: "string", hint: "Free-text search." },
    {
      key: "internal_id",
      label: "Internal ID",
      type: "string",
      hint: "Your own internal reference.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "customer", label: "customer" },
        { value: "prospect", label: "prospect" },
        { value: "supplier", label: "supplier" },
        { value: "all", label: "all" },
      ],
      hint: "Company type filter.",
    },
    { key: "siret", label: "SIRET", type: "string", hint: "French company registration number." },
    { key: "address_city", label: "City", type: "string", hint: "City filter." },
    { key: "address_zipcode", label: "ZIP code", type: "string", hint: "ZIP code filter." },
    { key: "is_prospect", label: "Prospects only", type: "boolean", hint: "Filter prospects." },
    { key: "is_customer", label: "Customers only", type: "boolean", hint: "Filter customers." },
    { key: "is_supplier", label: "Suppliers only", type: "boolean", hint: "Filter suppliers." },
    {
      key: "is_disabled",
      label: "Archived",
      type: "boolean",
      hint: "Return archived companies. Defaults to active only.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [{ value: "id", label: "id" }, { value: "name", label: "name" }, {
        value: "address_city",
        label: "address_city",
      }],
      hint: "Order of the returned data.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "page", type: "number", label: "Page requested" },
    { key: "nextPage", type: "number", label: "Next page number, null when this page was empty" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).many(`/companies`, {
      query: {
        "search": input.search,
        "internal_id": input.internal_id,
        "type": input.type,
        "siret": input.siret,
        "address_city": input.address_city,
        "address_zipcode": input.address_zipcode,
        "is_prospect": input.is_prospect,
        "is_customer": input.is_customer,
        "is_supplier": input.is_supplier,
        "is_disabled": input.is_disabled,
        "sort": input.sort,
      },
      page: input.page,
    });
  },
};

export default companyList;
