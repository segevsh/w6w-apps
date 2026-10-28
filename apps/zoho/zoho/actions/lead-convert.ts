import type { ActionDefinition } from "@w6w/types";
import { unwrapRecordResult, ZohoClient, type ZohoRecordResult } from "../lib/client.ts";
import { recordId } from "../lib/params.ts";

interface Input {
  recordId: string;
  createDeal: boolean;
  dealName?: string;
  dealClosingDate?: string;
  dealStage?: string;
  accountId?: string;
  contactId?: string;
  overwrite: boolean;
  notifyLeadOwner: boolean;
}

/**
 * `POST /Leads/{id}/actions/convert` — Zoho's dedicated conversion endpoint.
 * Unlike Salesforce (SOAP-only, no REST equivalent — deliberately left out of
 * that app in this pack), Zoho exposes this over REST.
 */
const leadConvert: ActionDefinition<Input, ZohoRecordResult> = {
  key: "lead-convert",
  type: "perform",
  resource: "lead",
  title: "Convert Lead",
  description: "Convert a Lead into a Contact (and, optionally, an Account and a Deal). " +
    "Pass an existing `accountId`/`contactId` to merge into those records instead of creating new ones.",
  // A converted Lead cannot be converted again — replaying fails rather than
  // duplicating, but that is still not "safe to retry" in the idempotent sense.
  idempotent: false,
  params: [
    recordId,
    { key: "createDeal", label: "Also create a Deal", type: "boolean", default: true },
    {
      key: "dealName",
      label: "Deal name",
      type: "string",
      hint: "Required by Zoho when `createDeal` is on.",
    },
    { key: "dealClosingDate", label: "Deal closing date", type: "date" },
    { key: "dealStage", label: "Deal stage", type: "string" },
    {
      key: "accountId",
      label: "Existing Account ID",
      type: "string",
      hint: "Merge into this Account instead of creating a new one.",
    },
    {
      key: "contactId",
      label: "Existing Contact ID",
      type: "string",
      hint: "Merge into this Contact instead of creating a new one.",
    },
    {
      key: "overwrite",
      label: "Overwrite existing record fields",
      type: "boolean",
      default: false,
    },
    { key: "notifyLeadOwner", label: "Notify Lead owner", type: "boolean", default: false },
  ],
  output: [
    { key: "code", type: "string", label: "Result code" },
    { key: "status", type: "string", label: "success | error" },
    {
      key: "details",
      type: "object",
      label: "New/updated Contact, Account and Deal ids",
    },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      overwrite: input.overwrite,
      notify_lead_owner: input.notifyLeadOwner,
    };
    if (input.contactId) body.Contacts = { id: input.contactId };
    if (input.accountId) body.Accounts = { id: input.accountId };
    if (input.createDeal) {
      body.Deals = {
        Deal_Name: input.dealName,
        ...(input.dealClosingDate ? { Closing_Date: input.dealClosingDate } : {}),
        ...(input.dealStage ? { Stage: input.dealStage } : {}),
      };
    }

    return new ZohoClient(ctx)
      .request<{ data: ZohoRecordResult[] }>(
        `/Leads/${encodeURIComponent(input.recordId)}/actions/convert`,
        { method: "POST", body: { data: [body] } },
      )
      .then(unwrapRecordResult);
  },
};

export default leadConvert;
