import type { ActionDefinition } from "@w6w/types";
import { listQuery, ProductiveClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * List deals and budgets (one endpoint, told apart by `budget`), filtered, sorted and paged (`GET /deals`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  query?: string;
  companyId?: number;
  projectId?: number;
  dealTypeId?: number;
  statusId?: number;
  filter?: unknown;
  sort?: string;
  include?: string;
  pageSize?: number;
  pageNumber?: number;
  cursorPaging?: boolean;
  cursor?: string;
}

const dealList: ActionDefinition<Input> = {
  key: "deal-list",
  type: "search",
  resource: "deal",
  title: "List Deals and Budgets",
  description:
    "List deals and budgets (one endpoint, told apart by `budget`), filtered, sorted and paged (`GET /deals`).",
  params: [
    { "key": "query", "label": "Search text", "type": "string" },
    { "key": "companyId", "label": "Company ID", "type": "number" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    {
      "key": "dealTypeId",
      "label": "Deal type",
      "type": "number",
      "hint": "1 or 2 (the vendor FAQ: 2 is a client deal, 1 internal).",
    },
    { "key": "statusId", "label": "Deal status ID", "type": "number" },
    ...listParams(
      "`name`, `-created_at`, `date`, `-last_activity_at`, `company_name`, `probability`; prefix `-` for descending.",
    ),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const items = await new ProductiveClient(ctx).many("/deals", {
      query: listQuery(input, {
        "query": input.query,
        "company_id": input.companyId,
        "project_id": input.projectId,
        "deal_type_id": input.dealTypeId,
        "status_id": input.statusId,
      }),
    });
    return items;
  },
};

export default dealList;
