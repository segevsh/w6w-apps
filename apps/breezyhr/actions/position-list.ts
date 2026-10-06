import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, company } from "../lib/client.ts";
import { companyIdParam, pageParam, pageSizeParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  state?: string;
  pageSize?: number;
  page?: number;
  sort?: string;
}

/**
 * `GET /company/{id}/positions` — a bare array. Archived positions are excluded unless
 * `state=archived`. Paging is opt-in: without `page_size` every match comes back at once.
 */
const positionList: ActionDefinition<Input> = {
  key: "position-list",
  type: "search",
  resource: "position",
  title: "List Positions",
  description:
    "List a company's positions, optionally by state. Archived positions are left out unless you ask for them.",
  params: [
    companyIdParam,
    {
      key: "state",
      label: "State",
      type: "select",
      hint: "Omit for every position except archived ones.",
      options: [
        { value: "published", label: "Published" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
        { value: "closed", label: "Closed" },
        { value: "pending", label: "Pending approval" },
      ],
    },
    pageSizeParam,
    pageParam,
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint: "Sort key for paged results; Breezy defaults to `updated`.",
    },
  ],
  output: [
    { key: "positions", type: "array", label: "Positions" },
    { key: "nextPage", type: "number", label: "Next page, when a full page came back" },
  ],

  async execute(input, ctx) {
    const positions = await new BreezyClient(ctx).array(`${company(input.companyId)}/positions`, {
      query: {
        state: input.state,
        page_size: input.pageSize,
        page: input.pageSize ? input.page : undefined,
        sort: input.pageSize ? input.sort : undefined,
      },
    });
    const full = input.pageSize !== undefined && positions.length >= input.pageSize;
    return { positions, ...(full ? { nextPage: (input.page ?? 1) + 1 } : {}) };
  },
};

export default positionList;
