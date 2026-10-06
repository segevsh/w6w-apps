import type { ActionDefinition } from "@w6w/types";
import { DubClient, strList } from "../lib/client.ts";

interface Input {
  domains: string[] | string;
}

/** `GET /domains/status` — availability of `.link` domains for purchase. */
const domainCheckAvailability: ActionDefinition<Input> = {
  key: "domain-check-availability",
  type: "read",
  resource: "domain",
  title: "Check Domain Availability",
  description:
    "Check whether one or more domains can be registered. Dub supports `.link` domains only.",
  params: [
    {
      key: "domains",
      label: "Domains",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "acme.link" },
      hint: "Fully-qualified `.link` domains to check.",
    },
  ],
  output: [
    {
      key: "domains",
      type: "array",
      label: "Per domain: { domain, available, premium, prices, price }",
    },
  ],

  async execute(input, ctx) {
    const domains = strList(input.domains);
    if (!domains) throw new Error("Give at least one domain.");
    const result = await new DubClient(ctx).request("GET", "/domains/status", {
      query: { domains },
    });
    return { domains: result };
  },
};

export default domainCheckAvailability;
