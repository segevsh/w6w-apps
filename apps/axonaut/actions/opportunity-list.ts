import type { ActionDefinition } from "@w6w/types";
import { AxonautClient } from "../lib/client.ts";

/**
 * `GET /api/v2/opportunities` — List sales opportunities, optionally by status.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  page?: number;
  status?: string;
}

const opportunityList: ActionDefinition<Input> = {
  key: "opportunity-list",
  type: "search",
  resource: "opportunity",
  title: "List Opportunities",
  description: "List sales opportunities, optionally by status.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint:
        "Page number, sent as the `page` header (1-based). The list ends at the first empty page.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "ongoing", label: "ongoing" }, { value: "archived", label: "archived" }, {
        value: "all",
        label: "all",
      }],
      hint: "Opportunity status filter.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Records on this page" },
    { key: "count", type: "number", label: "Records on this page" },
    { key: "page", type: "number", label: "Page requested" },
    { key: "nextPage", type: "number", label: "Next page number, null when this page was empty" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).many(`/opportunities`, {
      query: { "status": input.status },
      page: input.page,
    });
  },
};

export default opportunityList;
