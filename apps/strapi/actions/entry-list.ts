import type { ActionDefinition } from "@w6w/types";
import { StrapiClient } from "../lib/client.ts";
import { collectionParam, fieldsParam, populateParam, statusParam } from "../lib/params.ts";

interface Input {
  collection: string;
  filters?: Record<string, unknown>;
  sort?: string;
  fields?: string;
  populate?: unknown;
  page?: number;
  pageSize?: number;
  status?: string;
}

/**
 * `GET /api/<collection>` — Strapi's find-many, confirmed against
 * docs.strapi.io/cms/api/rest for filters/sort/pagination/populate syntax.
 * `filters` is the full nested filter-operator object (e.g.
 * `{ "title": { "$eq": "hi" } }`); `sort` is Strapi's compact
 * `field:asc,field2:desc` string, split here into the `sort[0]`/`sort[1]`
 * bracket form Strapi expects. `page`/`pageSize` use the page-based pagination
 * form (not `start`/`limit` — the two can't be mixed, per Strapi's docs).
 */
const entryList: ActionDefinition<Input> = {
  key: "entry-list",
  type: "search",
  resource: "entry",
  title: "List Entries",
  description: "List entries of a content type, with Strapi's filter/sort/pagination syntax.",
  params: [
    collectionParam,
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint: 'Strapi filter object, e.g. `{"title": {"$eq": "hello"}}`. See Strapi\'s filtering ' +
        "docs for the full `$eq`/`$contains`/`$gt`/`$in`/… operator list.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "publishedAt:desc",
      hint: "Comma-separated `field:asc` / `field:desc` clauses.",
    },
    fieldsParam,
    populateParam,
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 25, hint: "Max 100." },
    statusParam,
  ],
  output: [
    { key: "data", type: "array", label: "Entries" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    const client = StrapiClient.fromConnection(ctx);
    const sort = input.sort
      ? input.sort.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const fields = input.fields
      ? input.fields.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return client.request(`/api/${encodeURIComponent(input.collection)}`, {
      query: {
        filters: input.filters,
        sort,
        fields,
        populate: input.populate,
        pagination: { page: input.page, pageSize: input.pageSize },
        status: input.status,
      },
    });
  },
};

export default entryList;
