import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, position } from "../lib/client.ts";
import { companyIdParam, pageParam, pageSizeParam, positionIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  stageId?: string;
  pageSize?: number;
  page?: number;
  sort?: string;
}

/**
 * `GET /company/{id}/position/{id}/candidates` — a bare array of candidate summaries. Unpaged
 * unless `page_size` is sent (max 50; `page` is 1-based).
 */
const candidateList: ActionDefinition<Input> = {
  key: "candidate-list",
  type: "search",
  resource: "candidate",
  title: "List Candidates",
  description: "List the candidates on a position, optionally only those in one pipeline stage.",
  params: [
    companyIdParam,
    positionIdParam,
    {
      key: "stageId",
      label: "Stage ID",
      type: "string",
      hint: "Only candidates currently in this stage; ids come from Get Pipeline.",
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
    { key: "candidates", type: "array", label: "Candidates (summaries)" },
    { key: "nextPage", type: "number", label: "Next page, when a full page came back" },
  ],

  async execute(input, ctx) {
    const candidates = await new BreezyClient(ctx).array(
      `${position(input.companyId, input.positionId)}/candidates`,
      {
        query: {
          stage_id: input.stageId,
          page_size: input.pageSize,
          page: input.pageSize ? input.page : undefined,
          sort: input.pageSize ? input.sort : undefined,
        },
      },
    );
    const full = input.pageSize !== undefined && candidates.length >= input.pageSize;
    return { candidates, ...(full ? { nextPage: (input.page ?? 1) + 1 } : {}) };
  },
};

export default candidateList;
