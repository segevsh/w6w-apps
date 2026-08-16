import type { ActionDefinition } from "@w6w/types";
import {
  bareId,
  compact,
  epochMsFromDate,
  LinkedInAdsClient,
  sponsoredAccountUrn,
} from "../lib/client.ts";
import {
  accountIdParam,
  campaignGroupStatusOptions,
  moneyParams,
  objectiveTypeOptions,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  name: string;
  status?: string;
  runScheduleStart: string;
  runScheduleEnd?: string;
  totalBudgetAmount?: number;
  totalBudgetCurrency?: string;
  objectiveType?: string;
}

/**
 * `POST /rest/adAccounts/{accountId}/adCampaignGroups` — a plain single
 * create (no batch wrapper). `runScheduleEnd` is required by the vendor's
 * schema whenever `totalBudget` is set; left optional here to match the
 * schema exactly rather than always-require it.
 *
 * The new id comes back in `x-restli-id`, surfaced as `{ id }`.
 */
const campaignGroupCreate: ActionDefinition<Input> = {
  key: "campaign-group-create",
  type: "perform",
  resource: "campaign-group",
  title: "Create Campaign Group",
  description: "Create a Campaign Group in ACTIVE or DRAFT status. Not supported for ENTERPRISE " +
    "accounts.",
  idempotent: false,
  params: [
    accountIdParam,
    { key: "name", label: "Name", type: "string", required: true, hint: "Max 200 bytes UTF-8." },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "ACTIVE",
      options: campaignGroupStatusOptions.filter((o) =>
        o.value === "ACTIVE" || o.value === "DRAFT"
      ),
    },
    {
      key: "runScheduleStart",
      label: "Start date",
      type: "date",
      required: true,
      hint: "Inclusive. Campaigns under this group can't run before it.",
    },
    {
      key: "runScheduleEnd",
      label: "End date",
      type: "date",
      hint: "Exclusive. Required if Total budget is set. Leave empty for no end date.",
    },
    ...moneyParams(
      "totalBudget",
      "Total budget",
      "Maximum spend across all campaigns in this group for its lifetime.",
    ),
    {
      key: "objectiveType",
      label: "Objective type",
      type: "select",
      options: objectiveTypeOptions,
      advanced: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Campaign Group ID" }],

  async execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    const result = await client.request<{ id: string }>(
      `/rest/adAccounts/${bareId(input.accountId)}/adCampaignGroups`,
      {
        method: "POST",
        body: {
          account: sponsoredAccountUrn(input.accountId),
          name: input.name,
          status: input.status || "ACTIVE",
          runSchedule: compact({
            start: epochMsFromDate(input.runScheduleStart),
            end: epochMsFromDate(input.runScheduleEnd),
          }),
          ...compact({
            objectiveType: input.objectiveType,
            totalBudget: input.totalBudgetAmount !== undefined
              ? {
                amount: String(input.totalBudgetAmount),
                currencyCode: input.totalBudgetCurrency || "USD",
              }
              : undefined,
          }),
        },
      },
    );
    return { id: result.id };
  },
};

export default campaignGroupCreate;
