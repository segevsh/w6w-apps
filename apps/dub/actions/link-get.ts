import type { ActionDefinition } from "@w6w/types";
import { DubClient } from "../lib/client.ts";
import { LINK_OUTPUT } from "../lib/links.ts";

interface Input {
  linkId?: string;
  externalId?: string;
  domain?: string;
  key?: string;
}

/** `GET /links/info` — look a link up by ID, external ID, or domain + slug. */
const linkGet: ActionDefinition<Input> = {
  key: "link-get",
  type: "read",
  resource: "link",
  title: "Get Link",
  description:
    "Retrieve one short link by its ID, by its external ID, or by domain and slug together.",
  params: [
    { key: "linkId", label: "Link ID", type: "string" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "The link's ID in your own system.",
    },
    { key: "domain", label: "Domain", type: "string", hint: "Use together with the slug." },
    { key: "key", label: "Slug", type: "string", hint: "Use together with the domain." },
  ],
  output: LINK_OUTPUT,

  execute(input, ctx) {
    if (!input.linkId && !input.externalId && !(input.domain && input.key)) {
      throw new Error("Get Link needs a link ID, an external ID, or both domain and slug.");
    }
    return new DubClient(ctx).request("GET", "/links/info", {
      query: {
        linkId: input.linkId,
        externalId: input.externalId,
        domain: input.domain,
        key: input.key,
      },
    });
  },
};

export default linkGet;
