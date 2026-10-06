import type { ActionDefinition } from "@w6w/types";
import { PAGE_OUTPUT, PAGE_PARAMS, type PageInput, pageQuery } from "../lib/client.ts";
import { listOf } from "../lib/factories.ts";

interface Input extends PageInput, Record<string, unknown> {
  verified?: boolean;
}

const listDomains: ActionDefinition<Input> = listOf<Input>({
  key: "list-domains",
  resource: "domain",
  title: "List Domains",
  description:
    "List sending domains with their verification flags (`is_verified`, `spf`, `dkim`, `tracking`) and `domain_settings` (GET /v1/domains).",
  path: () => "/domains",
  params: [
    ...PAGE_PARAMS,
    {
      key: "verified",
      label: "Verified only",
      type: "boolean",
      hint: "Leave unset for all domains; set to filter on verification state.",
    },
  ],
  query: (i) => ({ ...pageQuery(i), verified: i.verified }),
  output: PAGE_OUTPUT,
});

export default listDomains;
