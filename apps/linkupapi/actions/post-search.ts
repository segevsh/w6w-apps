import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  keyword?: string;
  count?: number;
  offset?: number;
  postType?: string;
  sortBy?: string;
  postDate?: string;
  profileUrl?: string;
  companyUrl?: string;
  authorCompany?: string;
  authorIndustry?: string;
  authorJobTitle?: string;
  mentionsMember?: string;
  mentionsOrganization?: string;
  postedBy?: string;
}

const FIELDS: readonly Field[] = [
  ["keyword", "keyword", "s"],
  ["count", "count", "n"],
  ["offset", "offset", "n"],
  ["postType", "post_type", "s"],
  ["sortBy", "sort_by", "s"],
  ["postDate", "post_date", "s"],
  ["profileUrl", "profile_url", "s"],
  ["companyUrl", "company_url", "s"],
  ["authorCompany", "author_company", "s"],
  ["authorIndustry", "author_industry", "s"],
  ["authorJobTitle", "author_job_title", "s"],
  ["mentionsMember", "mentions_member", "s"],
  ["mentionsOrganization", "mentions_organization", "s"],
  ["postedBy", "posted_by", "s"],
];

const postSearch: ActionDefinition<Input, ActionResult> = {
  key: "post-search",
  type: "search",
  resource: "content",
  title: "Search Posts",
  description: "Search posts by keyword with author, date and content-type filters.",
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
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of posts to return (default 10).",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint:
        "Zero-indexed offset; pass the previous response's pagination.next_offset for the next page.",
    },
    {
      key: "postType",
      label: "Post type",
      type: "string",
      hint: "For example VIDEOS, IMAGES or ARTICLES.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [{ "value": "date_posted", "label": "date_posted" }, {
        "value": "relevance",
        "label": "relevance",
      }],
    },
    {
      key: "postDate",
      label: "Posted within",
      type: "string",
      hint: "For example past-24h, past-week, past-month.",
    },
    { key: "profileUrl", label: "Author profile URL", type: "string" },
    { key: "companyUrl", label: "Author company URL", type: "string" },
    { key: "authorCompany", label: "Author's company", type: "string" },
    { key: "authorIndustry", label: "Author's industry", type: "string" },
    { key: "authorJobTitle", label: "Author's job title", type: "string" },
    { key: "mentionsMember", label: "Mentions member", type: "string" },
    { key: "mentionsOrganization", label: "Mentions organization", type: "string" },
    {
      key: "postedBy",
      label: "Posted by",
      type: "string",
      hint: "first, following or first,following.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "content",
      "search",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default postSearch;
