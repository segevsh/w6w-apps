import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  companyUrl: string;
}

const FIELDS: readonly Field[] = [
  ["companyUrl", "company_url", "s"],
];

const companyGet: ActionDefinition<Input, ActionResult> = {
  key: "company-get",
  type: "read",
  resource: "companies",
  title: "Get Company",
  description: "Read a LinkedIn company page: description, size, industry, headquarters.",
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
      key: "companyUrl",
      label: "Company URL",
      type: "string",
      required: true,
      hint: "URL of the LinkedIn company page.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "profiles",
      "get_company",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default companyGet;
