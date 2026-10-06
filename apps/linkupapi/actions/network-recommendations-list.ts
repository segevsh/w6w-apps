import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  count?: number;
}

const FIELDS: readonly Field[] = [
  ["count", "count", "n"],
];

const networkRecommendationsList: ActionDefinition<Input, ActionResult> = {
  key: "network-recommendations-list",
  type: "read",
  resource: "network",
  title: "Get Network Recommendations",
  description: "List people the account may know.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of recommendations to return (default 10).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "network",
      "recommendations",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default networkRecommendationsList;
