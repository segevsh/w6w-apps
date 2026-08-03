import type { ActionDefinition } from "@w6w/types";
import {
  DEAL_STATUSES,
  FubClient,
  type FubList,
  optionsFrom,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  pipelineId?: number;
  userId?: number;
  personId?: number;
  status?: string;
  includeDeleted?: boolean;
  includeArchived?: boolean;
}

/**
 * `GET /deals` — search transactions.
 *
 * Deals are Follow Up Boss's transaction pipeline — the buyer/seller side of the
 * product, distinct from the lead nurture side that People and Events cover.
 *
 * Two notes on the filters, both from the endpoint's own schema:
 *
 *  - `includeDeleted` and `includeArchived` are documented as taking the integer
 *    `1`, not a boolean ("Set to `1` to include deals with a status of
 *    `Deleted`"). They are exposed as booleans for a sane form and converted to
 *    `1` on the way out — sending `true` where `1` is specified is the kind of
 *    thing that works until it doesn't.
 *  - `status` is a separate enum filter (`Active`, `Archived`, `Deleted`) that
 *    overlaps those two flags. Using `status` is the more explicit way to ask.
 *
 * The response `_metadata` on this endpoint carries an extra `totalByStageId`
 * map alongside the usual fields — a per-stage count, useful for rendering a
 * pipeline board without a second pass. It arrives untouched in `metadata`.
 *
 * Deal custom fields come back as top-level `customField...` keys on each deal,
 * same flat convention as People.
 */
const searchDeals: ActionDefinition<Input> = {
  key: "search-deals",
  type: "search",
  resource: "deal",
  title: "Search Deals",
  description:
    "Search transactions by pipeline, agent, contact or status. The response metadata includes " +
    "`totalByStageId`, a per-stage count that renders a pipeline board without a second query.",
  params: [
    {
      key: "pipelineId",
      label: "Pipeline id",
      type: "number",
      hint: "Only deals in this pipeline. Ids come from the List Pipelines action.",
    },
    {
      key: "personId",
      label: "Person id",
      type: "number",
      hint: "Only deals involving this contact.",
    },
    {
      key: "userId",
      label: "User id",
      type: "number",
      hint: "Only deals involving this agent.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: optionsFrom(DEAL_STATUSES),
      hint: "Return only deals with this status. More explicit than the two include flags below.",
    },
    {
      key: "includeArchived",
      label: "Include archived",
      type: "boolean",
      advanced: true,
      hint: "Add archived deals to the results.",
    },
    {
      key: "includeDeleted",
      label: "Include deleted",
      type: "boolean",
      advanced: true,
      hint: "Add deleted deals to the results.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx): Promise<FubList> {
    return new FubClient(ctx).list("/deals", {
      query: {
        ...pageQuery(input),
        pipelineId: input.pipelineId,
        userId: input.userId,
        personId: input.personId,
        status: input.status,
        // Documented as integer flags ("Set to `1` to include..."), not booleans.
        includeDeleted: input.includeDeleted ? 1 : undefined,
        includeArchived: input.includeArchived ? 1 : undefined,
      },
    });
  },
};

export default searchDeals;
