import type { ActionDefinition } from "@w6w/types";
import {
  assertEnum,
  compact,
  GoogleAdsClient,
  jsonObject,
  resolveResourceName,
} from "../lib/client.ts";
import { customerId, mutateOutput, partialFailure, validateOnly } from "../lib/params.ts";

/**
 * The bidding-strategy `oneof` arms this action can select. Whitelisted rather
 * than trusted from the select, because the value becomes an object key in the
 * request body and an unrecognised one would be a silently-ignored field.
 */
const BIDDING_STRATEGIES = [
  "manualCpc",
  "maximizeConversions",
  "maximizeConversionValue",
  "targetSpend",
] as const;

function biddingStrategyArm(value: string): string {
  if (!(BIDDING_STRATEGIES as readonly string[]).includes(value)) {
    throw new Error(`\`biddingStrategy\` must be one of: ${BIDDING_STRATEGIES.join(", ")}.`);
  }
  return value;
}

interface Input {
  name: string;
  campaignBudget: string;
  advertisingChannelType: string;
  status?: string;
  biddingStrategy?: string;
  startDateTime?: string;
  endDateTime?: string;
  targetGoogleSearch?: boolean;
  targetSearchNetwork?: boolean;
  targetContentNetwork?: boolean;
  containsEuPoliticalAdvertising?: string;
  additionalFields?: string;
  customerId?: string;
  validateOnly?: boolean;
  partialFailure?: boolean;
}

/**
 * `CampaignService.Mutate` (create) —
 * `POST /v25/customers/{customerId}/campaigns:mutate`.
 *
 * Four things Google requires that are easy to get wrong, and how this action
 * handles each:
 *
 *   - **A budget must already exist.** `campaignBudget` is a resource
 *     reference, so run `create-campaign-budget` first. A bare budget id is
 *     accepted and expanded; a full `customers/…/campaignBudgets/…` passes
 *     through.
 *   - **`advertising_channel_type` is immutable and required on create.** It
 *     cannot be changed afterwards, which is why it is a required param here
 *     and absent from `update-campaign`.
 *   - **A bidding strategy is a `oneof`.** Exactly one of `manualCpc`,
 *     `maximizeConversions`, `targetSpend`, … may be set, so this exposes a
 *     single select that writes one empty strategy object rather than several
 *     booleans that could contradict each other. Strategies needing their own
 *     configuration go through `additionalFields`.
 *   - **Dates are `start_date_time` / `end_date_time`.** v25 has no
 *     `start_date` / `end_date` — those field paths do not exist on the
 *     campaign resource in this version. The format is
 *     `yyyy-MM-dd HH:mm:ss` in the serving account's time zone.
 *
 * `status` defaults to `PAUSED`, matching Google's own sample: a campaign
 * created live starts spending money immediately, and that should be a
 * deliberate act rather than the default of an automated call.
 *
 * Not idempotent: each call creates a new campaign, and these services take no
 * client-supplied request key to dedupe on.
 */
const createCampaign: ActionDefinition<Input> = {
  key: "create-campaign",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description:
    "Create a campaign against an existing budget. Defaults to PAUSED so it does not start spending on creation.",
  idempotent: false,
  params: [
    { key: "name", label: "Campaign name", type: "string", required: true },
    {
      key: "campaignBudget",
      label: "Campaign budget",
      type: "string",
      required: true,
      hint:
        "Budget ID or resource name from `create-campaign-budget` — e.g. `customers/1234567890/campaignBudgets/42`.",
    },
    {
      key: "advertisingChannelType",
      label: "Channel type",
      type: "select",
      required: true,
      default: "SEARCH",
      options: [
        { value: "SEARCH", label: "Search" },
        { value: "DISPLAY", label: "Display" },
        { value: "SHOPPING", label: "Shopping" },
        { value: "VIDEO", label: "Video" },
        { value: "PERFORMANCE_MAX", label: "Performance Max" },
        { value: "DEMAND_GEN", label: "Demand Gen" },
      ],
      hint: "Immutable — it cannot be changed after the campaign exists.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "PAUSED",
      options: [
        { value: "PAUSED", label: "Paused" },
        { value: "ENABLED", label: "Enabled" },
      ],
      hint: "ENABLED starts serving — and spending — as soon as the campaign is created.",
    },
    {
      key: "biddingStrategy",
      label: "Bidding strategy",
      type: "select",
      options: [
        { value: "manualCpc", label: "Manual CPC" },
        { value: "maximizeConversions", label: "Maximize conversions" },
        { value: "maximizeConversionValue", label: "Maximize conversion value" },
        { value: "targetSpend", label: "Target spend (maximize clicks)" },
      ],
      hint:
        "Sets one empty strategy object. Strategies that need their own settings (target CPA, target ROAS) go in Additional fields.",
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
      hint: "`yyyy-MM-dd HH:mm:ss`. Omit to run indefinitely.",
    },
    {
      key: "targetGoogleSearch",
      label: "Target Google Search",
      type: "boolean",
      hint: "Part of `networkSettings`. Only sent if set.",
    },
    {
      key: "targetSearchNetwork",
      label: "Target Search Partners",
      type: "boolean",
      hint: "Requires Target Google Search to also be true.",
    },
    { key: "targetContentNetwork", label: "Target Display Network", type: "boolean" },
    {
      key: "containsEuPoliticalAdvertising",
      label: "EU political advertising",
      type: "select",
      options: [
        {
          value: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
          label: "Does not contain EU political advertising",
        },
        {
          value: "CONTAINS_EU_POLITICAL_ADVERTISING",
          label: "Contains EU political advertising",
        },
      ],
      hint:
        "Advertiser self-declaration. Declaring EU political content restricts serving in the EU.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: "Any other Campaign field, merged into the create body.",
    },
    customerId,
    validateOnly,
    partialFailure,
  ],
  output: mutateOutput,

  execute(input, ctx) {
    const client = new GoogleAdsClient(ctx);
    const cid = client.customerId(input.customerId);

    const networkSettings = compact({
      targetGoogleSearch: input.targetGoogleSearch,
      targetSearchNetwork: input.targetSearchNetwork,
      targetContentNetwork: input.targetContentNetwork,
    });

    const create: Record<string, unknown> = {
      ...compact({
        name: input.name,
        campaignBudget: resolveResourceName(
          cid,
          "campaignBudgets",
          input.campaignBudget,
          "campaignBudget",
        ),
        advertisingChannelType: assertEnum(
          input.advertisingChannelType,
          "advertisingChannelType",
        ),
        status: input.status ? assertEnum(input.status, "status") : "PAUSED",
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
        containsEuPoliticalAdvertising: input.containsEuPoliticalAdvertising
          ? assertEnum(input.containsEuPoliticalAdvertising, "containsEuPoliticalAdvertising")
          : undefined,
      }),
      ...(Object.keys(networkSettings).length ? { networkSettings } : {}),
      // The bidding strategy is a protobuf `oneof`: setting an empty object
      // selects the arm, which is exactly what Google's own samples do for
      // strategies that carry no required settings.
      ...(input.biddingStrategy ? { [biddingStrategyArm(input.biddingStrategy)]: {} } : {}),
      ...jsonObject(input.additionalFields, "additionalFields"),
    };

    ctx.log("info", "creating campaign", { customerId: cid, name: input.name });
    return client.mutate(cid, "campaigns", {
      operations: [{ create }],
      ...compact({ validateOnly: input.validateOnly, partialFailure: input.partialFailure }),
    });
  },
};

export default createCampaign;
