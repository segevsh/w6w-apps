import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";
import { mapLead } from "../lib/lead.ts";

interface Input {
  url: string;
}

/** `GET /reverse_lookup/linkedin?url=` */
const reverseLookupLinkedin: ActionDefinition<Input> = {
  key: "reverse-lookup-linkedin",
  type: "read",
  resource: "person",
  title: "Reverse Lookup LinkedIn",
  description: "Look up a person from their LinkedIn profile URL: name, title, company and " +
    "location. Costs a credit when a person is found.",
  params: [{
    key: "url",
    label: "LinkedIn profile URL",
    type: "string",
    required: true,
    placeholder: "https://www.linkedin.com/in/…",
  }],
  output: [
    { key: "lead", type: "object", label: "Person: name, title, company, linkedinUrl, addresses" },
  ],

  async execute(input, ctx) {
    const url = String(input.url ?? "").trim();
    if (!url) throw new Error("url is required");
    const { data } = await new ClearoutClient(ctx).request("/reverse_lookup/linkedin", {
      query: { url },
    });
    return { lead: mapLead((data as { lead?: unknown } | undefined)?.lead) };
  },
};

export default reverseLookupLinkedin;
