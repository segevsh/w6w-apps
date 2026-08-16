import type { ActionDefinition } from "@w6w/types";
import {
  asJson,
  bareId,
  compact,
  epochMsFromDate,
  LinkedInAdsClient,
  sponsoredAccountUrn,
  sponsoredCampaignGroupUrn,
} from "../lib/client.ts";
import {
  accountIdParam,
  campaignGroupIdParam,
  campaignStatusOptions,
  campaignTypeOptions,
  costTypeOptions,
  creativeSelectionOptions,
  moneyParams,
  objectiveTypeOptions,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  campaignGroupId: string;
  name: string;
  type: string;
  costType: string;
  localeCountry: string;
  localeLanguage: string;
  dailyBudgetAmount?: number;
  dailyBudgetCurrency?: string;
  totalBudgetAmount?: number;
  totalBudgetCurrency?: string;
  unitCostAmount?: number;
  unitCostCurrency?: string;
  targetingCriteria: string;
  associatedEntity?: string;
  objectiveType?: string;
  status?: string;
  creativeSelection?: string;
  audienceExpansionEnabled?: boolean;
  offsiteDeliveryEnabled?: boolean;
  runScheduleStart?: string;
  runScheduleEnd?: string;
}

/**
 * `POST /rest/adAccounts/{accountId}/adCampaigns` — a plain single create
 * (no batch wrapper; the docs lead with `Batch Create Campaigns` but a bare
 * object body works, confirmed by the "Create a Campaign" example). The new
 * id comes back in `x-restli-id`, surfaced as `{ id }`.
 *
 * Requires exactly one of Daily budget / Total budget (the vendor's schema:
 * `dailyBudget` "True, unless totalBudget is provided") — validated here
 * rather than left for the API's 4xx, since which one is missing is the
 * useful part of the error.
 *
 * `targetingCriteria` is free-form JSON rather than a generated form: it is
 * a generic AND/OR boolean expression over dozens of targeting facets
 * (`urn:li:adTargetingFacet:locations`, `:industries`, `:seniorities`, …),
 * each with its own entity vocabulary discovered via the separate
 * `adTargetingFacets`/`adTargetingEntities` APIs — modeling that as Params
 * would mean re-deriving LinkedIn's entire targeting taxonomy, which is out
 * of scope here (see the README). Shape per the vendor's own example:
 * `{"include":{"and":[{"or":{"urn:li:adTargetingFacet:locations":["urn:li:geo:103644278"]}}]}}`.
 * The `interfaceLocales` facet is required whenever targeting is updated
 * later (not on create).
 *
 * Not `idempotent`: no create-time dedupe key is documented.
 */
const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description: "Create a Campaign under a Campaign Group.",
  idempotent: false,
  params: [
    accountIdParam,
    campaignGroupIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    { key: "type", label: "Type", type: "select", required: true, options: campaignTypeOptions },
    {
      key: "costType",
      label: "Cost type",
      type: "select",
      required: true,
      options: costTypeOptions,
    },
    {
      key: "localeCountry",
      label: "Locale country",
      type: "string",
      required: true,
      placeholder: "US",
      hint: "Uppercase 2-letter ISO-3166 country code. Must be a supported locale combination.",
    },
    {
      key: "localeLanguage",
      label: "Locale language",
      type: "string",
      required: true,
      placeholder: "en",
      hint: "Lowercase 2-letter ISO-639 language code.",
    },
    ...moneyParams("dailyBudget", "Daily budget", "Max spend per day (UTC), resets at midnight."),
    ...moneyParams("totalBudget", "Total budget", "Max spend for the campaign's lifetime."),
    {
      key: "targetingCriteria",
      label: "Targeting criteria (JSON)",
      type: "json",
      required: true,
      hint: "Boolean AND/OR expression over urn:li:adTargetingFacet:* facets. Example: " +
        '{"include":{"and":[{"or":{"urn:li:adTargetingFacet:locations":["urn:li:geo:103644278"]}}]}}',
    },
    {
      key: "associatedEntity",
      label: "Associated entity URN",
      type: "string",
      advanced: true,
      hint: "Required for Sponsored Content, Dynamic Ads or Lead Gen Forms campaigns — the " +
        "organization or member the campaign advertises on behalf of.",
    },
    {
      key: "objectiveType",
      label: "Objective type",
      type: "select",
      options: objectiveTypeOptions,
      advanced: true,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "ACTIVE",
      options: campaignStatusOptions,
    },
    {
      key: "creativeSelection",
      label: "Creative selection",
      type: "select",
      default: "OPTIMIZED",
      options: creativeSelectionOptions,
      advanced: true,
    },
    {
      key: "audienceExpansionEnabled",
      label: "Audience expansion",
      type: "boolean",
      advanced: true,
    },
    {
      key: "offsiteDeliveryEnabled",
      label: "Offsite delivery (LinkedIn Audience Network)",
      type: "boolean",
      default: false,
    },
    ...moneyParams(
      "unitCost",
      "Unit cost / bid",
      "Bid, target cost, or cost cap per the campaign's bidding strategy.",
    ).map(
      (p) => ({ ...p, advanced: true }),
    ),
    { key: "runScheduleStart", label: "Start date", type: "date", advanced: true },
    { key: "runScheduleEnd", label: "End date", type: "date", advanced: true },
  ],
  output: [{ key: "id", type: "string", label: "Campaign ID" }],

  async execute(input, ctx) {
    if (input.dailyBudgetAmount === undefined && input.totalBudgetAmount === undefined) {
      throw new Error("Set either Daily budget or Total budget amount.");
    }

    const body: Record<string, unknown> = {
      account: sponsoredAccountUrn(input.accountId),
      campaignGroup: sponsoredCampaignGroupUrn(input.campaignGroupId),
      name: input.name,
      type: input.type,
      costType: input.costType,
      locale: { country: input.localeCountry, language: input.localeLanguage },
      targetingCriteria: asJson(input.targetingCriteria, "targetingCriteria"),
      status: input.status || "ACTIVE",
      creativeSelection: input.creativeSelection || "OPTIMIZED",
      audienceExpansionEnabled: input.audienceExpansionEnabled ?? false,
      offsiteDeliveryEnabled: input.offsiteDeliveryEnabled ?? false,
      unitCost: {
        amount: String(input.unitCostAmount ?? 0),
        currencyCode: input.unitCostCurrency || "USD",
      },
      ...compact({
        associatedEntity: input.associatedEntity,
        objectiveType: input.objectiveType,
        dailyBudget: input.dailyBudgetAmount !== undefined
          ? {
            amount: String(input.dailyBudgetAmount),
            currencyCode: input.dailyBudgetCurrency || "USD",
          }
          : undefined,
        totalBudget: input.totalBudgetAmount !== undefined
          ? {
            amount: String(input.totalBudgetAmount),
            currencyCode: input.totalBudgetCurrency || "USD",
          }
          : undefined,
      }),
    };
    const runSchedule = compact({
      start: epochMsFromDate(input.runScheduleStart),
      end: epochMsFromDate(input.runScheduleEnd),
    });
    if (Object.keys(runSchedule).length > 0) body.runSchedule = runSchedule;

    const client = new LinkedInAdsClient(ctx);
    const result = await client.request<{ id: string }>(
      `/rest/adAccounts/${bareId(input.accountId)}/adCampaigns`,
      { method: "POST", body },
    );
    return { id: result.id };
  },
};

export default campaignCreate;
