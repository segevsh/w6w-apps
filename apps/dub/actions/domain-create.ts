import type { ActionDefinition } from "@w6w/types";
import { compact, DubClient } from "../lib/client.ts";
import { DOMAIN_OUTPUT, DOMAIN_PARAMS } from "../lib/domains.ts";

interface Input {
  slug: string;
  expiredUrl?: string | null;
  notFoundUrl?: string | null;
  archived?: boolean;
  placeholder?: string | null;
  assetLinks?: string | null;
  appleAppSiteAssociation?: string | null;
}

/** `POST /domains` — answers 201 with the domain. */
const domainCreate: ActionDefinition<Input> = {
  key: "domain-create",
  type: "perform",
  resource: "domain",
  title: "Create Domain",
  description:
    "Add a custom domain to the workspace. DNS must then be configured and verified before it serves links.",
  idempotent: false,
  params: [
    {
      key: "slug",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "go.example.com",
      hint: "The domain name without protocol.",
      validation: { maxLength: 190 },
    },
    ...DOMAIN_PARAMS,
  ],
  output: DOMAIN_OUTPUT,

  execute(input, ctx) {
    return new DubClient(ctx).request("POST", "/domains", { body: compact({ ...input }) });
  },
};

export default domainCreate;
