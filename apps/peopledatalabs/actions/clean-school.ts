import type { ActionDefinition } from "@w6w/types";
import { PdlClient, pick } from "../lib/client.ts";

type Input = Record<string, unknown>;

const cleanSchool: ActionDefinition<Input> = {
  key: "clean-school",
  type: "read",
  resource: "cleaner",
  title: "Clean School",
  description:
    "Resolve a messy school name, website or social URL to PDL's canonical school record. Needs one of name, website or profile. Free up to 10,000 calls a month. No match is found: false, not an error.",
  params: [
    { key: "name", label: "School name", type: "string", placeholder: "Harvard" },
    { key: "website", label: "Website", type: "string", placeholder: "harvard.edu" },
    {
      key: "profile",
      label: "Social profile URL",
      type: "string",
      placeholder: "linkedin.com/school/harvard-university",
    },
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL resolved a school" },
    { key: "status", type: "number", label: "PDL status" },
    { key: "name", type: "string", label: "Canonical name" },
    { key: "id", type: "string", label: "PDL school ID" },
  ],

  async execute(input, ctx) {
    const query = pick(input, ["name", "website", "profile"]);
    if (Object.keys(query).length === 0) throw new Error("Give a name, website or profile.");
    return await new PdlClient(ctx).request("GET", "/v5/school/clean", { query, notFound: {} });
  },
};

export default cleanSchool;
