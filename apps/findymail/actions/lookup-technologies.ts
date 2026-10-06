import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient, strList } from "../lib/client.ts";

interface Input {
  domain: string;
  technologies?: string;
}

const lookupTechnologies: ActionDefinition<Input> = {
  key: "lookup-technologies",
  type: "search",
  resource: "technology",
  title: "Lookup Technologies by Domain",
  description:
    "Get a company's technology stack by domain, optionally filtered to named technologies. Costs 1 finder credit when technologies are found, free otherwise. The 200 body is not shown in Findymail's reference, so it is returned verbatim as `result`. Spends credits only on a hit; a 402 means the balance is empty and a 423 that the subscription is paused.",
  params: [{ "key": "domain", "label": "Domain", "type": "string", "required": true }, {
    "key": "technologies",
    "label": "Technologies",
    "type": "string",
    "hint": "Comma-separated technology names to filter by (case-insensitive).",
  }],
  output: [{ "key": "result", "type": "object", "label": "Findymail's response, verbatim" }],

  async execute(input, ctx) {
    const body = await new FindymailClient(ctx).request("POST", "/api/technologies", {
      body: compact({ domain: input.domain, technologies: strList(input.technologies) }),
    });
    return { result: body };
  },
};

export default lookupTechnologies;
