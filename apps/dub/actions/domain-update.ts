import type { ActionDefinition } from "@w6w/types";
import { compact, DubClient, seg } from "../lib/client.ts";
import { DOMAIN_OUTPUT, DOMAIN_PARAMS } from "../lib/domains.ts";

interface Input {
  domain: string;
  slug?: string;
  expiredUrl?: string | null;
  notFoundUrl?: string | null;
  archived?: boolean;
  placeholder?: string | null;
  assetLinks?: string | null;
  appleAppSiteAssociation?: string | null;
}

/** `PATCH /domains/{slug}`. */
const domainUpdate: ActionDefinition<Input> = {
  key: "domain-update",
  type: "perform",
  resource: "domain",
  title: "Update Domain",
  description: "Change a domain's redirects, archive state or deep-link files.",
  idempotent: true,
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "go.example.com",
      hint: "The existing domain name.",
    },
    {
      key: "slug",
      label: "New domain name",
      type: "string",
      hint: "Rename the domain. Leave empty to keep it.",
      validation: { maxLength: 190 },
    },
    ...DOMAIN_PARAMS,
  ],
  output: DOMAIN_OUTPUT,

  execute(input, ctx) {
    const { domain, ...rest } = input;
    return new DubClient(ctx).request("PATCH", `/domains/${seg(domain)}`, {
      body: compact({ ...rest }),
    });
  },
};

export default domainUpdate;
