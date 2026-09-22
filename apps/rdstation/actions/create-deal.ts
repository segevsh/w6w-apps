import type { ActionDefinition } from "@w6w/types";

import { API_BASE, compact, jsonInit, sendJson } from "../lib/client.ts";

/**
 * `POST /deals` — create one deal, optionally linked to an organization and a
 * campaign.
 *
 * The documented body has three top-level keys: `deal` with the deal's own
 * fields, and two links expressed as `{ _id }` references —
 * `organization: { _id }` and `campaign: { _id }`. A link object is sent only
 * when its id is filled in.
 *
 * ## What is deliberately not here
 *
 * The same body accepts `contacts`, `deal_products`, `distribution_settings` and
 * `deal_source`, and they are all left out. For `contacts` that is a real gap in
 * the API rather than a shortcut: unlike `organization`/`campaign`, its items are
 * **full embedded contact objects**, not `{ _id }` references, so an existing
 * contact cannot be linked by id through this endpoint at all. See `README.md`.
 *
 * `idempotent: false` — no idempotency key, so a retried step can create a
 * second deal.
 */
interface Input {
  name?: string;
  dealStageId?: string;
  userId?: string;
  rating?: number;
  predictionDate?: string;
  organizationId?: string;
  campaignId?: string;
}

const createDeal: ActionDefinition<Input> = {
  key: "create-deal",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  description:
    "Create a deal in RD Station CRM, optionally linked to an organization and a campaign.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", hint: "The deal's name." },
    {
      key: "dealStageId",
      label: "Stage ID",
      type: "string",
      hint: "The pipeline stage the deal starts in, from List Deal Pipelines.",
    },
    {
      key: "userId",
      label: "Owner user ID",
      type: "string",
      hint: "The `id` of the user who owns the deal, from List Users.",
    },
    {
      key: "rating",
      label: "Rating",
      type: "number",
      hint: "The vendor's numeric deal rating (how hot the deal is).",
    },
    {
      key: "predictionDate",
      label: "Prediction date",
      type: "date",
      hint: "The date the deal is expected to close.",
    },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      hint: "Links the deal to an existing organization by `_id`.",
    },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      hint: "Links the deal to a campaign by `_id`.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Deal ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "deal_stage", type: "object", label: "Stage the deal landed in" },
    { key: "organization", type: "object", label: "Linked organization" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/deals`);
    const body: Record<string, unknown> = {
      deal: compact({
        name: input.name,
        deal_stage_id: input.dealStageId,
        user_id: input.userId,
        rating: input.rating,
        prediction_date: input.predictionDate,
      }),
    };
    if (input.organizationId) body.organization = { _id: input.organizationId };
    if (input.campaignId) body.campaign = { _id: input.campaignId };

    return sendJson(ctx, url, jsonInit("POST", body));
  },
};

export default createDeal;
