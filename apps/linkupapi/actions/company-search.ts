import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  keyword?: string;
  location?: string;
  sector?: string;
  companySize?: string;
  offset?: number;
  count?: number;
}

const FIELDS: readonly Field[] = [
  ["keyword", "keyword", "s"],
  ["location", "location", "m"],
  ["sector", "sector", "m"],
  ["companySize", "company_size", "m"],
  ["offset", "offset", "n"],
  ["count", "count", "n"],
];

const companySearch: ActionDefinition<Input, ActionResult> = {
  key: "company-search",
  type: "search",
  resource: "companies",
  title: "Search Companies",
  description: "Search LinkedIn company pages by keyword, location, sector and size.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    { key: "keyword", label: "Keyword", type: "string" },
    {
      key: "location",
      label: "Location",
      type: "string",
      hint: "Several values separated by a semicolon (;).",
    },
    {
      key: "sector",
      label: "Sector",
      type: "string",
      hint: "Several values separated by a semicolon (;).",
    },
    {
      key: "companySize",
      label: "Company size",
      type: "string",
      hint: "Ranges such as 11-50 or 201-500. Several values separated by a semicolon (;).",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint:
        "Zero-indexed offset; pass the previous response's pagination.next_offset for the next page.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of companies to return (default 10).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "profiles",
      "search_companies",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default companySearch;
