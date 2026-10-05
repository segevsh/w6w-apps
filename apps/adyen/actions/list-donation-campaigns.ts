import type { ActionDefinition } from "@w6w/types";
import { AdyenClient, type BodySpec, buildBody } from "../lib/client.ts";
import { additionalFieldsParam, currencyParam, merchantAccountParam } from "../lib/params.ts";

/**
 * `POST /donationCampaigns` (added in v67) is a lookup, so it is a `read`.
 *
 * See the Checkout API v72 reference.
 */
interface Input {
  merchantAccount?: string;
  currency: string;
  locale?: string;
  store?: string;
  additionalFields?: unknown;
}

const listDonationCampaignsSpec: BodySpec = { fields: ["currency", "locale", "store"] };

const listDonationCampaigns: ActionDefinition<Input> = {
  key: "list-donation-campaigns",
  type: "read",
  resource: "donation",
  title: "List Donation Campaigns",
  description:
    "List the donation campaigns active for a currency, optionally filtered by locale or store.",
  params: [
    merchantAccountParam,
    currencyParam,
    { key: "locale", label: "Locale", type: "string", placeholder: "en-US" },
    { key: "store", label: "Store", type: "string" },
    additionalFieldsParam,
  ],
  output: [
    { key: "donationCampaigns", type: "array", label: "Donation campaigns" },
  ],

  execute(input, ctx) {
    const body = buildBody(ctx, input, listDonationCampaignsSpec);
    return new AdyenClient(ctx).post("/donationCampaigns", body);
  },
};

export default listDonationCampaigns;
