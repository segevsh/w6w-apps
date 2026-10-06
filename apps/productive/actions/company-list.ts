import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List companies (clients, vendors), filtered, sorted and paged (`GET /companies`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  status?: number;
  name?: string;
  companyCode?: string;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const companyList: ActionDefinition<Input> = {
  key: "company-list",
  type: "search",
  resource: "company",
  title: "List Companies",
  description: "List companies (clients, vendors), filtered, sorted and paged (`GET /companies`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "hint": "Vendor status filter: 1 or 2 (active / archived).",
      "options": [{ "value": 1, "label": "Active" }, { "value": 2, "label": "Archived" }],
    },
    { "key": "name", "label": "Name", "type": "string" },
    { "key": "companyCode", "label": "Company code", "type": "string" },
    ...listParams(
      "`name`, `-created_at`, `company_code`, `last_activity_at`; prefix `-` for descending.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/companies", {
      query: listQuery(input, {
        "query": input.query,
        "status": input.status,
        "name": input.name,
        "company_code": input.companyCode,
      }),
    });
    return items;
  },
};

export default companyList;
