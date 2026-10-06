import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  number: string;
  appId?: string;
  alias?: string;
  subaccount?: string;
  cnamLookup?: "enabled" | "disabled";
  cnam?: string;
}

/**
 * `POST /v1/Account/{auth_id}/Number/{number}/` — change the application,
 * alias, subaccount or CNAM settings of a number you own. Plivo answers 202
 * with `{ api_id, message: "changed" }`. Caller Reputation and the deprecated
 * callback fields are not exposed.
 */
const updateNumber: ActionDefinition<Input> = {
  key: "update-number",
  type: "perform",
  resource: "number",
  title: "Update Account Phone Number",
  description: "Point a number at an application, or change its alias, subaccount or CNAM.",
  idempotent: true,
  params: [
    { key: "number", label: "Number", type: "string", required: true },
    {
      key: "appId",
      label: "Application ID",
      type: "string",
      hint: "Application to assign (or a Zentrunk inbound trunk ID).",
    },
    { key: "alias", label: "Alias", type: "string" },
    {
      key: "subaccount",
      label: "Subaccount Auth ID",
      type: "string",
      hint: "Transfer the number to this subaccount.",
    },
    {
      key: "cnamLookup",
      label: "CNAM lookup",
      type: "select",
      options: [{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }],
      hint: "US only.",
    },
    { key: "cnam", label: "Caller ID name", type: "string", hint: "Name shown on outbound calls." },
  ],

  output: [
    { key: "message", type: "string", label: "Status message" },
    { key: "api_id", type: "string", label: "Request ID" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request(`Number/${segment("number", input.number)}/`, {
      method: "POST",
      json: {
        app_id: input.appId,
        alias: input.alias,
        subaccount: input.subaccount,
        cnam_lookup: input.cnamLookup,
        cnam: input.cnam,
      },
    });
  },
};

export default updateNumber;
