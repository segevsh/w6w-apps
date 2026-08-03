import type { ActionDefinition } from "@w6w/types";
import {
  assertEnum,
  compact,
  fieldPaths,
  GoogleAdsClient,
  jsonObject,
  resolveResourceName,
  unset,
} from "../lib/client.ts";
import { customerId, mutateOutput, partialFailure, validateOnly } from "../lib/params.ts";

interface Input {
  campaignId: string;
  name?: string;
  status?: string;
  campaignBudget?: string;
  startDateTime?: string;
  endDateTime?: string;
  additionalFields?: string;
  updateMask?: string;
  customerId?: string;
  validateOnly?: boolean;
  partialFailure?: boolean;
}

/**
 * `CampaignService.Mutate` (update) —
 * `POST /v25/customers/{customerId}/campaigns:mutate`.
 *
 * **The update mask is the whole story.** Google applies exactly the fields
 * named in `updateMask` and ignores everything else in the body — so an update
 * that omits the mask changes nothing, and a mask naming a field the body
 * doesn't set *clears* that field. Rather than make the caller assemble it,
 * this action derives the mask from whichever params were actually filled in,
 * which is both what people expect and the only way a partial update is safe.
 * The mask uses **snake_case field paths** even though the JSON body is
 * camelCase — that asymmetry is Google's, not a typo here.
 *
 * `additionalFields` widens this to any campaign field; because those keys
 * can't be inferred, an explicit `updateMask` param is available and is unioned
 * with the derived one.
 *
 * `advertising_channel_type` is deliberately absent: it is immutable after
 * creation, so offering it would only produce server-side errors.
 *
 * Idempotent: the operation sets named fields to given values, so replaying it
 * lands the campaign in the same state.
 */
const updateCampaign: ActionDefinition<Input> = {
  key: "update-campaign",
  type: "perform",
  resource: "campaign",
  title: "Update Campaign",
  description:
    "Update a campaign's name, status, budget or schedule. The update mask is derived from the fields you fill in.",
  idempotent: true,
  params: [
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      required: true,
      hint: "Campaign ID or full resource name.",
    },
    { key: "name", label: "Campaign name", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "ENABLED", label: "Enabled" },
        { value: "PAUSED", label: "Paused" },
        { value: "REMOVED", label: "Removed" },
      ],
      hint: "REMOVED is Google Ads' delete — it is not reversible.",
    },
    {
      key: "campaignBudget",
      label: "Campaign budget",
      type: "string",
      hint: "Budget ID or resource name to move this campaign onto.",
    },
    {
      key: "startDateTime",
      label: "Start",
      type: "string",
      placeholder: "2026-08-05 00:00:00",
      hint: "`yyyy-MM-dd HH:mm:ss` in the serving account's time zone.",
    },
    {
      key: "endDateTime",
      label: "End",
      type: "string",
      placeholder: "2026-09-05 23:59:59",
      hint: "`yyyy-MM-dd HH:mm:ss`.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: "Any other Campaign field. Name them in Update mask too, or Google will ignore them.",
    },
    {
      key: "updateMask",
      label: "Update mask",
      type: "string",
      hint:
        "Comma-separated snake_case field paths, unioned with the mask derived from the fields above — e.g. `manual_cpc.enhanced_cpc_enabled`.",
    },
    customerId,
    validateOnly,
    partialFailure,
  ],
  output: mutateOutput,

  execute(input, ctx) {
    const client = new GoogleAdsClient(ctx);
    const cid = client.customerId(input.customerId);

    const update: Record<string, unknown> = compact({
      resourceName: resolveResourceName(cid, "campaigns", input.campaignId, "campaignId"),
      name: unset(input.name),
      status: input.status ? assertEnum(input.status, "status") : undefined,
      campaignBudget: input.campaignBudget
        ? resolveResourceName(cid, "campaignBudgets", input.campaignBudget, "campaignBudget")
        : undefined,
      startDateTime: unset(input.startDateTime),
      endDateTime: unset(input.endDateTime),
    });

    // Derive the mask from what was actually supplied. `resource_name`
    // identifies the row and is never part of the mask.
    const derived: string[] = [];
    if (update.name !== undefined) derived.push("name");
    if (update.status !== undefined) derived.push("status");
    if (update.campaignBudget !== undefined) derived.push("campaign_budget");
    if (update.startDateTime !== undefined) derived.push("start_date_time");
    if (update.endDateTime !== undefined) derived.push("end_date_time");

    Object.assign(update, jsonObject(input.additionalFields, "additionalFields"));

    const mask = [...new Set([...derived, ...fieldPaths(input.updateMask, "updateMask")])];
    if (mask.length === 0) {
      throw new Error(
        "Nothing to update: fill in at least one field, or name the fields from `additionalFields` in `updateMask`.",
      );
    }

    ctx.log("info", "updating campaign", { customerId: cid, updateMask: mask.join(",") });
    return client.mutate(cid, "campaigns", {
      operations: [{ update, updateMask: mask.join(",") }],
      ...compact({ validateOnly: input.validateOnly, partialFailure: input.partialFailure }),
    });
  },
};

export default updateCampaign;
