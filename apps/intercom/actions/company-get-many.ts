import type { ActionDefinition } from "@w6w/types";
import { IntercomClient } from "../lib/client.ts";

interface Input {
  companyId?: string;
  name?: string;
  tagId?: string;
  segmentId?: string;
  page?: number;
  perPage?: number;
}

/**
 * GET /companies — list companies, optionally filtered by your `company_id`,
 * `name`, `tag_id` or `segment_id`. Uses page-number pagination (`page` /
 * `per_page`); the response `pages` object reports `total_pages`.
 */
const companyGetMany: ActionDefinition<Input> = {
  key: "company-get-many",
  type: "search",
  resource: "company",
  title: "List Companies",
  description: "List companies, optionally filtered by company ID, name, tag or segment.",
  params: [
    { key: "companyId", label: "Company ID", type: "string", row: "filter" },
    { key: "name", label: "Name", type: "string", row: "filter" },
    { key: "tagId", label: "Tag ID", type: "string", advanced: true },
    { key: "segmentId", label: "Segment ID", type: "string", advanced: true },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { min: 1, integer: true },
      hint: "1-based page number.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 15,
      validation: { min: 1, integer: true },
      hint: "Defaults to 15 on Intercom's side.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Companies" },
    { key: "pages", type: "object", label: "Pagination" },
    { key: "total_count", type: "number", label: "Total count" },
  ],

  execute(input, ctx) {
    return new IntercomClient(ctx).request("/companies", {
      query: {
        company_id: input.companyId,
        name: input.name,
        tag_id: input.tagId,
        segment_id: input.segmentId,
        page: input.page,
        per_page: input.perPage ?? 15,
      },
    });
  },
};

export default companyGetMany;
