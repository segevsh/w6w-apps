import type { ActionDefinition } from "@w6w/types";
import { call, requireArray, V2 } from "../lib/client.ts";
import { json } from "../lib/params.ts";

type Input = {
  domains: string[] | string;
};

const blacklistDomainAdd: ActionDefinition<Input> = {
  key: "blacklist-domain-add",
  type: "perform",
  resource: "blacklist",
  title: "Blacklist Domains",
  description: "Add up to 500 domains to the blacklist; prospects on them are no longer contacted.",
  idempotent: true,
  params: [
    json("domains", "Domains", { required: true, hint: "JSON array of domains, at most 500." }),
  ],
  output: [
    { key: "domains", type: "array", label: "Domains now blacklisted" },
    { key: "count", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "POST", V2, "/blacklist/domains", {
      body: { domains: requireArray("domains", input.domains, 500) },
    }) as { domains?: string[] };
    const domains = body.domains ?? [];
    return { domains, count: domains.length };
  },
};

export default blacklistDomainAdd;
