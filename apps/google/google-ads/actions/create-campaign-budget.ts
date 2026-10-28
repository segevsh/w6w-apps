import type { ActionDefinition } from "@w6w/types";
import { compact, GoogleAdsClient, jsonObject } from "../lib/client.ts";
import { customerId, mutateOutput, partialFailure, validateOnly } from "../lib/params.ts";

interface Input {
  name: string;
  amountMicros: number;
  deliveryMethod?: string;
  explicitlyShared?: boolean;
  additionalFields?: string;
  customerId?: string;
  validateOnly?: boolean;
  partialFailure?: boolean;
}

/**
 * `CampaignBudgetService.Mutate` —
 * `POST /v25/customers/{customerId}/campaignBudgets:mutate`.
 *
 * A campaign cannot be created without a budget resource to point at, so this
 * is step one of the two-call sequence Google's own "add campaigns" guide
 * describes: create the budget, take the `resourceName` off the result, pass it
 * to `create-campaign`.
 *
 * **Micros.** Money in this API is always integer *micros* of the account
 * currency — one millionth of a unit. A $50.00 daily budget is
 * `amountMicros: 50000000`. There is no decimal form; getting this wrong by a
 * factor of a million is the classic first-day mistake, hence the hint.
 *
 * Not idempotent: each call creates a new budget, and Google has no client-side
 * request key for these services to dedupe on.
 */
const createCampaignBudget: ActionDefinition<Input> = {
  key: "create-campaign-budget",
  type: "perform",
  resource: "campaign_budget",
  title: "Create Campaign Budget",
  description:
    "Create a campaign budget. Its resource name is what `create-campaign` needs for `campaignBudget`.",
  idempotent: false,
  params: [
    { key: "name", label: "Budget name", type: "string", required: true },
    {
      key: "amountMicros",
      label: "Amount (micros)",
      type: "number",
      required: true,
      hint: "Micros of the account currency — 1,000,000 micros = 1 unit. $50.00/day is 50000000.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "deliveryMethod",
      label: "Delivery method",
      type: "select",
      options: [
        { value: "STANDARD", label: "Standard — spread spend over the day" },
        { value: "ACCELERATED", label: "Accelerated" },
      ],
      hint: "Google's default is STANDARD.",
    },
    {
      key: "explicitlyShared",
      label: "Shared budget",
      type: "boolean",
      hint: "True makes the budget reusable across campaigns.",
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint:
        'Any other CampaignBudget field, merged into the create body — e.g. `{"period": "DAILY"}`.',
    },
    customerId,
    validateOnly,
    partialFailure,
  ],
  output: mutateOutput,

  execute(input, ctx) {
    const client = new GoogleAdsClient(ctx);
    const cid = client.customerId(input.customerId);
    const create = {
      ...compact({
        name: input.name,
        amountMicros: input.amountMicros,
        deliveryMethod: input.deliveryMethod,
        explicitlyShared: input.explicitlyShared,
      }),
      ...jsonObject(input.additionalFields, "additionalFields"),
    };
    ctx.log("info", "creating campaign budget", { customerId: cid, name: input.name });
    return client.mutate(cid, "campaignBudgets", {
      operations: [{ create }],
      ...compact({ validateOnly: input.validateOnly, partialFailure: input.partialFailure }),
    });
  },
};

export default createCampaignBudget;
