import type { ActionDefinition } from "@w6w/types";
import { PdlClient, pick } from "../lib/client.ts";

type Input = Record<string, unknown>;

const cleanCompany: ActionDefinition<Input> = {
  key: "clean-company",
  type: "read",
  resource: "cleaner",
  title: "Clean Company",
  description:
    "Resolve a messy company name, website or social URL to PDL's canonical company record (id, cleaned name, size, industry, location, profiles). Needs one of name, website or profile. Free up to 10,000 calls a month. No match is found: false, not an error.",
  params: [
    { key: "name", label: "Company name", type: "string", placeholder: "People data Labs" },
    { key: "website", label: "Website", type: "string", placeholder: "www.peopledatalabs.com" },
    {
      key: "profile",
      label: "Social profile URL",
      type: "string",
      placeholder: "linkedin.com/company/google",
    },
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL resolved a company" },
    { key: "status", type: "number", label: "PDL status" },
    { key: "id", type: "string", label: "PDL company ID" },
    { key: "name", type: "string", label: "Canonical name" },
    { key: "score", type: "number", label: "Match score" },
    { key: "fuzzy_match", type: "boolean", label: "Whether the match was approximate" },
  ],

  async execute(input, ctx) {
    const query = pick(input, ["name", "website", "profile"]);
    if (Object.keys(query).length === 0) throw new Error("Give a name, website or profile.");
    return await new PdlClient(ctx).request("GET", "/v5/company/clean", { query, notFound: {} });
  },
};

export default cleanCompany;
