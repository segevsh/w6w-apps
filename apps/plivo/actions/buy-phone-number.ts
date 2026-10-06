import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  number: string;
  appId?: string;
  cnamLookup?: "enabled" | "disabled";
  complianceApplicationId?: string;
  subaccount?: string;
}

/**
 * `POST /v1/Account/{auth_id}/PhoneNumber/{number}/` — rents the number, which
 * is billed (setup + monthly). Plivo bills and owns numbers at the MAIN-account
 * level: called with subaccount credentials this answers 404 even for a number
 * a search just returned. Success is `{ message: "created", status: "fulfilled",
 * numbers: [{ number, status }] }`; a number needing verification documents
 * stays `pending` until they are approved.
 */
const buyPhoneNumber: ActionDefinition<Input> = {
  key: "buy-phone-number",
  type: "perform",
  resource: "number",
  title: "Buy Phone Number",
  description: "Rent a phone number from Plivo's inventory (billed).",
  idempotent: false,
  params: [
    {
      key: "number",
      label: "Number",
      type: "string",
      required: true,
      hint: "A number from Search Available Phone Numbers, e.g. 14155559186.",
    },
    {
      key: "appId",
      label: "Application ID",
      type: "string",
      hint: "Application to assign. Defaults to the account's default number application.",
    },
    {
      key: "cnamLookup",
      label: "CNAM lookup",
      type: "select",
      options: [{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }],
      hint: "US numbers only.",
    },
    {
      key: "complianceApplicationId",
      label: "Compliance application ID",
      type: "string",
      hint: "UUID of an accepted compliance application. Required for India numbers.",
    },
    {
      key: "subaccount",
      label: "Subaccount Auth ID",
      type: "string",
      hint: "Assign the number to a subaccount at purchase. Needs main-account credentials.",
    },
  ],

  output: [
    { key: "message", type: "string", label: "Status message" },
    { key: "status", type: "string", label: "Overall status" },
    { key: "numbers", type: "array", label: "Per-number results" },
    { key: "api_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request(`PhoneNumber/${segment("number", input.number)}/`, {
      method: "POST",
      json: {
        app_id: input.appId,
        cnam_lookup: input.cnamLookup,
        compliance_application_id: input.complianceApplicationId,
        subaccount: input.subaccount,
      },
    });
  },
};

export default buyPhoneNumber;
