import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  number: string;
}

const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch one ledger account by number.",
  params: [
    {
      "key": "number",
      "label": "Account number",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "Account",
      "type": "object",
      "label": "Account record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/accounts/${seg(input.number)}`);
  },
};

export default accountGet;
