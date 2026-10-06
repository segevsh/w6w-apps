import type { ActionDefinition } from "@w6w/types";
import { encodeId, LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";

interface Input {
  accountId: string;
}

const accountGet: ActionDefinition<Input, ActionResult> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "Read one connected account: status, checkpoint state, country and Sales Navigator seat.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "The account_id to read.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).request(
      "GET",
      `/v2/accounts/${encodeId(input.accountId, "accountId")}`,
    );
  },
};

export default accountGet;
