import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";
import { pagination, parseList, updatedAfter } from "../lib/params.ts";

interface Input {
  type?: "customer" | "supplier" | "organization" | "";
  term?: string;
  identifier?: string;
  ids?: string;
  tags?: string[] | string;
  includeArchived?: boolean;
  page?: number;
  perPage?: number;
  updatedAfter?: string;
}

/**
 * `GET /companies` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. Returns customers,
 * suppliers and organizations visible to the current user.
 */
const companyList: ActionDefinition<Input> = {
  key: "company-list",
  type: "search",
  resource: "company",
  title: "List Companies",
  description: "List companies (customers, suppliers, organizations). Use filters to narrow.",
  params: [
    { key: "term", label: "Search term", type: "string" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "", label: "Any" },
        { value: "customer", label: "Customer" },
        { value: "supplier", label: "Supplier" },
        { value: "organization", label: "Organization" },
      ],
    },
    { key: "identifier", label: "Identifier", type: "string", advanced: true },
    {
      key: "ids",
      label: "IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated company IDs.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated list of tag names.",
    },
    { key: "includeArchived", label: "Include archived", type: "boolean", advanced: true },
    updatedAfter,
    ...pagination,
  ],
  output: [
    { key: "companies", type: "array", label: "Companies" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Entries per page" },
    { key: "total", type: "number", label: "Total records" },
  ],

  async execute(input, ctx) {
    const { items, page } = await new MocoClient(ctx).list("/companies", {
      query: {
        term: input.term,
        type: input.type || undefined,
        identifier: input.identifier,
        ids: input.ids,
        tags: parseList(input.tags)?.join(","),
        include_archived: input.includeArchived,
        updated_after: input.updatedAfter,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { companies: items, page: page.page, perPage: page.perPage, total: page.total };
  },
};

export default companyList;
