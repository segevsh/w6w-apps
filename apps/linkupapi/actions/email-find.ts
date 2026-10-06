import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  companyDomain?: string;
  companyName?: string;
  profileUrl?: string;
}

const FIELDS: readonly Field[] = [
  ["firstName", "first_name", "s"],
  ["lastName", "last_name", "s"],
  ["companyDomain", "company_domain", "s"],
  ["companyName", "company_name", "s"],
  ["profileUrl", "profile_url", "s"],
];

const emailFind: ActionDefinition<Input, ActionResult> = {
  key: "email-find",
  type: "search",
  resource: "enrich",
  title: "Find Email",
  description:
    "Find a professional email address from a name and company, or from a LinkedIn profile URL.",
  params: [
    {
      key: "firstName",
      label: "First name",
      type: "string",
      hint: "Required unless profileUrl is given.",
    },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "companyDomain",
      label: "Company domain",
      type: "string",
      hint: "Either this or company name.",
    },
    { key: "companyName", label: "Company name", type: "string" },
    {
      key: "profileUrl",
      label: "Profile URL",
      type: "string",
      hint: "Name and company are taken from the profile.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "enrich",
      "find_email",
      undefined,
      mapInput(input, FIELDS),
    );
  },
};

export default emailFind;
