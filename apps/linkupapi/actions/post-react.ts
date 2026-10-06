import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  postUrl: string;
  reactionType?: string;
  companyUrl?: string;
}

const FIELDS: readonly Field[] = [
  ["postUrl", "post_url", "s"],
  ["reactionType", "reaction_type", "s"],
  ["companyUrl", "company_url", "s"],
];

const postReact: ActionDefinition<Input, ActionResult> = {
  key: "post-react",
  type: "perform",
  resource: "content",
  title: "React to Post",
  description: "React to a post, optionally as a company page you administer.",
  idempotent: false,
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
      key: "postUrl",
      label: "Post URL",
      type: "string",
      required: true,
      hint: "URL of the LinkedIn post.",
    },
    {
      key: "reactionType",
      label: "Reaction",
      type: "select",
      options: [
        { "value": "LIKE", "label": "LIKE" },
        { "value": "CELEBRATE", "label": "CELEBRATE" },
        { "value": "SUPPORT", "label": "SUPPORT" },
        { "value": "FUNNY", "label": "FUNNY" },
        { "value": "LOVE", "label": "LOVE" },
        { "value": "INSIGHTFUL", "label": "INSIGHTFUL" },
      ],
      default: "LIKE",
    },
    {
      key: "companyUrl",
      label: "As company page",
      type: "string",
      hint: "Company page URL to react as; you must administer it.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "content",
      "react",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default postReact;
