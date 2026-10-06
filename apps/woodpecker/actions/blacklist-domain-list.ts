import type { ActionDefinition } from "@w6w/types";
import { call, csv, V2 } from "../lib/client.ts";
import { int, str } from "../lib/params.ts";

type Input = {
  page?: number;
  per_page?: number;
  domain_filter?: string;
};

const blacklistDomainList: ActionDefinition<Input> = {
  key: "blacklist-domain-list",
  type: "read",
  resource: "blacklist",
  title: "List Blacklisted Domains",
  description: "List blacklisted domains, or check specific ones with a wildcard filter.",
  params: [
    int("page", "Page"),
    int("per_page", "Per page", { hint: "Default 100, maximum 500." }),
    str("domain_filter", "Domain filter", {
      hint: "Comma-separated domains to check; * is a wildcard.",
    }),
  ],
  output: [
    { key: "domains", type: "array", label: "Blacklisted domains" },
    { key: "count", type: "number", label: "Returned on this page" },
    { key: "total", type: "number", label: "Total blacklisted, or total found with a filter" },
  ],

  async execute(input, ctx) {
    const body = await call(ctx, "GET", V2, "/blacklist/domains", {
      query: {
        page: input.page,
        per_page: input.per_page,
        domain_filter: csv(input.domain_filter),
      },
    }) as { domains?: string[]; total?: number };
    const domains = body.domains ?? [];
    return { domains, count: domains.length, total: body.total ?? domains.length };
  },
};

export default blacklistDomainList;
