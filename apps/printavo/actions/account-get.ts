import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";

const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "The Printavo account (shop) of the current session: company name, contact details, locale.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "companyName", type: "string", label: "Company Name" },
  ],

  async execute(_input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ account: unknown }>(
      `{ account { id companyName companyEmail phone website locale logoUrl paymentProcessorPresent address { address1 address2 city stateIso zipCode countryIso } } }`,
    );
    return data.account;
  },
};

export default accountGet;
