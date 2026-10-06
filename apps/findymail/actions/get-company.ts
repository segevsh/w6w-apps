import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient } from "../lib/client.ts";

interface Input {
  linkedin_url?: string;
  domain?: string;
  name?: string;
}

const getCompany: ActionDefinition<Input> = {
  key: "get-company",
  type: "search",
  resource: "finder",
  title: "Get Company Information",
  description:
    "Retrieve company data from a LinkedIn company URL, a domain or a name — at least one is required. Costs 1 finder credit per hit; a miss answers 404.",
  params: [{ "key": "linkedin_url", "label": "Company LinkedIn URL", "type": "string" }, {
    "key": "domain",
    "label": "Domain",
    "type": "string",
  }, { "key": "name", "label": "Company name", "type": "string" }],
  output: [
    { "key": "name", "type": "string", "label": "Name" },
    { "key": "domain", "type": "string", "label": "Domain" },
    { "key": "company_size", "type": "string", "label": "Company size" },
    { "key": "industry", "type": "string", "label": "Industry" },
    { "key": "linkedin_url", "type": "string", "label": "LinkedIn URL" },
    { "key": "description", "type": "string", "label": "Description" },
  ],

  async execute(input, ctx) {
    if (!input.linkedin_url && !input.domain && !input.name) {
      throw new Error("Get Company needs a LinkedIn URL, a domain or a name.");
    }
    return await new FindymailClient(ctx).request("POST", "/api/search/company", {
      body: compact({ linkedin_url: input.linkedin_url, domain: input.domain, name: input.name }),
    });
  },
};

export default getCompany;
