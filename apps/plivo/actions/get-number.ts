import type { ActionDefinition } from "@w6w/types";
import { PlivoClient, segment } from "../lib/client.ts";

interface Input {
  number: string;
}

/** `GET /v1/Account/{auth_id}/Number/{number}/` — one number on the account. */
const getNumber: ActionDefinition<Input> = {
  key: "get-number",
  type: "read",
  resource: "number",
  title: "Get Account Phone Number",
  description: "Retrieve the details of one phone number on the account.",
  params: [
    {
      key: "number",
      label: "Number",
      type: "string",
      required: true,
      hint: "A number on the account, e.g. 17609915566.",
    },
  ],

  output: [
    { key: "number", type: "string", label: "Number" },
    { key: "alias", type: "string", label: "Alias" },
    { key: "application", type: "string", label: "Linked application URI" },
    { key: "number_type", type: "string", label: "Type" },
    { key: "region", type: "string", label: "Region" },
    { key: "monthly_rental_rate", type: "string", label: "Monthly rental (USD)" },
    { key: "renewal_date", type: "string", label: "Renewal date" },
    { key: "sms_enabled", type: "boolean", label: "SMS enabled" },
    { key: "voice_enabled", type: "boolean", label: "Voice enabled" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request(`Number/${segment("number", input.number)}/`);
  },
};

export default getNumber;
