import type { ActionDefinition } from "@w6w/types";

import { API_BASE, applyQuery, sendJson } from "../lib/client.ts";

/**
 * `GET /deals` — the deal (negociação) list with the documented filters.
 *
 * `win` is the interesting one: `true` returns won deals, `false` lost ones, and
 * **blank returns the open deals** — the API's own three-valued reading of one
 * parameter. This action exposes it as a two-option select and sends nothing
 * when it is left empty, which is the blank form the vendor documents.
 *
 * The response envelope is `{ deals, has_more, total, next_page }`, returned
 * verbatim; only the first **10,000** records are reachable, and a token whose
 * visibilidade for negociações is Restrito sees only deals it owns.
 */
interface Input {
  page?: number;
  limit?: number;
  order?: string;
  direction?: string;
  name?: string;
  win?: string;
  userId?: string;
  dealStageId?: string;
  dealPipelineId?: string;
  dealLostReasonId?: string;
  organization?: string;
  campaignId?: string;
}

const listDeals: ActionDefinition<Input> = {
  key: "list-deals",
  type: "search",
  resource: "deal",
  title: "List Deals",
  description: "List CRM deals with the documented paging, ordering and filters.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based. Only the first 10,000 records of the list are reachable at all.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "limit",
      label: "Per page",
      type: "number",
      default: 20,
      hint: "The API's default is 20 and its maximum is 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    {
      key: "order",
      label: "Order by",
      type: "string",
      placeholder: "created_at",
      hint: "Field to sort on, as the API names it.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    { key: "name", label: "Name", type: "string", hint: "Filter by deal name." },
    {
      key: "win",
      label: "Outcome",
      type: "select",
      options: [
        { value: "true", label: "Won only" },
        { value: "false", label: "Lost only" },
      ],
      hint: "Leave empty for open deals — the API reads a blank `win` as neither won nor lost.",
    },
    {
      key: "userId",
      label: "Owner user ID",
      type: "string",
      hint: "Filter by the owning user's `id`, from List Users.",
    },
    {
      key: "dealStageId",
      label: "Stage ID",
      type: "string",
      hint: "Filter by stage, from List Deal Pipelines.",
    },
    {
      key: "dealPipelineId",
      label: "Pipeline ID",
      type: "string",
      hint: "Filter by pipeline, from List Deal Pipelines.",
    },
    {
      key: "dealLostReasonId",
      label: "Lost reason ID",
      type: "string",
      hint: "Filter by the reason a deal was lost.",
    },
    {
      key: "organization",
      label: "Organization ID",
      type: "string",
      hint: "Filter by the linked organization's `_id`.",
    },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      hint: "Filter by campaign.",
    },
  ],
  output: [
    { key: "deals", type: "array", label: "Deals on this page" },
    { key: "has_more", type: "boolean", label: "Whether another page is reachable" },
    { key: "total", type: "number", label: "Records visible to this token" },
    { key: "next_page", type: "number", label: "Next page the API suggests" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/deals`);
    applyQuery(url, {
      page: input.page,
      limit: input.limit,
      order: input.order,
      direction: input.direction,
      name: input.name,
      win: input.win,
      user_id: input.userId,
      deal_stage_id: input.dealStageId,
      deal_pipeline_id: input.dealPipelineId,
      deal_lost_reason_id: input.dealLostReasonId,
      organization: input.organization,
      campaign_id: input.campaignId,
    });
    return sendJson(ctx, url);
  },
};

export default listDeals;
