import type { ActionDefinition } from "@w6w/types";
import { compact, LinkedInAdsClient } from "../lib/client.ts";

interface Input {
  name: string;
  currency?: string;
  reference?: string;
  notifiedOnCampaignOptimization?: boolean;
  notifiedOnCreativeApproval?: boolean;
  notifiedOnCreativeRejection?: boolean;
  notifiedOnEndOfCampaign?: boolean;
}

/**
 * `POST /rest/adAccounts` — a plain single create (no batch wrapper, no
 * `X-RestLi-Method` header — the default Rest.li `CREATE`). `type` is
 * omitted from the input params entirely rather than exposed as a choice:
 * the vendor's own note is unambiguous — "The type field must be set to
 * BUSINESS when creating Ad Accounts" — `ENTERPRISE` is reserved for
 * accounts LinkedIn's internal ad-ops systems create, so offering it here
 * would be a documented-to-fail option.
 *
 * The new account's id comes back in the `x-restli-id` response header, not
 * the body, surfaced here as `{ id }`.
 *
 * Not `idempotent`: LinkedIn documents no create-time dedupe key, so a
 * retried call creates a second Ad Account.
 */
const adAccountCreate: ActionDefinition<Input> = {
  key: "ad-account-create",
  type: "perform",
  resource: "ad-account",
  title: "Create Ad Account",
  description: "Create a Business Ad Account. Requires an authenticated user assigned as the " +
    "account administrator once created.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      default: "USD",
      hint: "3-letter ISO currency code, e.g. USD. Brazilian Real (BRL) bills in USD regardless " +
        "of the account's display currency — see the vendor's own note if offering it.",
    },
    {
      key: "reference",
      label: "Reference",
      type: "string",
      hint: "The entity this account advertises on behalf of: urn:li:organization:{id} or " +
        "urn:li:person:{id}.",
    },
    {
      key: "notifiedOnCampaignOptimization",
      label: "Notify on campaign optimization opportunities",
      type: "boolean",
    },
    { key: "notifiedOnCreativeApproval", label: "Notify on creative approval", type: "boolean" },
    { key: "notifiedOnCreativeRejection", label: "Notify on creative rejection", type: "boolean" },
    { key: "notifiedOnEndOfCampaign", label: "Notify on campaign end", type: "boolean" },
  ],
  output: [{ key: "id", type: "string", label: "Ad Account ID" }],

  async execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    const result = await client.request<{ id: string }>("/rest/adAccounts", {
      method: "POST",
      body: {
        type: "BUSINESS",
        currency: input.currency || "USD",
        ...compact({
          name: input.name,
          reference: input.reference,
          notifiedOnCampaignOptimization: input.notifiedOnCampaignOptimization,
          notifiedOnCreativeApproval: input.notifiedOnCreativeApproval,
          notifiedOnCreativeRejection: input.notifiedOnCreativeRejection,
          notifiedOnEndOfCampaign: input.notifiedOnEndOfCampaign,
        }),
      },
    });
    return { id: result.id };
  },
};

export default adAccountCreate;
