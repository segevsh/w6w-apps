import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  searchUrl?: string;
  keyword?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  companyName?: string;
  companyUrl?: string;
  pastCompany?: string;
  location?: string;
  schoolUrl?: string;
  industry?: string;
  network?: string;
  connectionOf?: string;
  followerOf?: string;
  offset?: number;
  count?: number;
}

const FIELDS: readonly Field[] = [
  ["searchUrl", "search_url", "s"],
  ["keyword", "keyword", "s"],
  ["firstName", "first_name", "s"],
  ["lastName", "last_name", "s"],
  ["title", "title", "s"],
  ["companyName", "company_name", "s"],
  ["companyUrl", "company_url", "m"],
  ["pastCompany", "past_company", "m"],
  ["location", "location", "m"],
  ["schoolUrl", "school_url", "m"],
  ["industry", "industry", "m"],
  ["network", "network", "m"],
  ["connectionOf", "connection_of", "s"],
  ["followerOf", "follower_of", "s"],
  ["offset", "offset", "n"],
  ["count", "count", "n"],
];

const peopleSearch: ActionDefinition<Input, ActionResult> = {
  key: "people-search",
  type: "search",
  resource: "profiles",
  title: "Search People",
  description:
    "Search LinkedIn members by keyword, title, company, location, school, industry or network degree.",
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
      key: "searchUrl",
      label: "Search URL",
      type: "string",
      hint: "A copied LinkedIn people-search URL; replaces the other filters.",
    },
    { key: "keyword", label: "Keyword", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    {
      key: "companyUrl",
      label: "Company URL or ID",
      type: "string",
      hint: "A company page URL or a Typeahead id. Several values separated by a semicolon (;).",
    },
    {
      key: "pastCompany",
      label: "Past company",
      type: "string",
      hint: "Name, URL or id. Several values separated by a semicolon (;).",
    },
    {
      key: "location",
      label: "Location",
      type: "string",
      hint: "Name or id. Several values separated by a semicolon (;).",
    },
    {
      key: "schoolUrl",
      label: "School URL or ID",
      type: "string",
      hint: "Several values separated by a semicolon (;).",
    },
    {
      key: "industry",
      label: "Industry",
      type: "string",
      hint: "Several values separated by a semicolon (;).",
    },
    {
      key: "network",
      label: "Network degree",
      type: "string",
      hint: "F (1st), S (2nd), O (3rd+). Several values separated by a semicolon (;).",
    },
    {
      key: "connectionOf",
      label: "Connections of",
      type: "string",
      hint: "A profile URL, identifier or Typeahead id.",
    },
    { key: "followerOf", label: "Followers of", type: "string", hint: "A company or profile." },
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
      hint: "Number of profiles to return (default 10).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "profiles",
      "search_people",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default peopleSearch;
