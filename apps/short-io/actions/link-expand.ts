import type { ActionDefinition } from "@w6w/types";
import { LINK_OUTPUT, ShortClient, type ShortLink, stripPassword } from "../lib/client.ts";

interface Input {
  domain: string;
  path: string;
}

/**
 * GET /links/expand?domain=&path= — resolve a short URL (hostname + slug) to
 * its link record. 404 when the domain is not in the connected organization.
 */
const linkExpand: ActionDefinition<Input, ShortLink> = {
  key: "link-expand",
  type: "read",
  resource: "link",
  title: "Expand Link",
  description: "Look a link up by its domain hostname and path, e.g. go.example.com and /spring.",
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "go.example.com",
    },
    { key: "path", label: "Path (slug)", type: "string", required: true, placeholder: "spring" },
  ],
  output: LINK_OUTPUT,

  async execute(input, ctx) {
    const link = await new ShortClient(ctx).request<ShortLink>("/links/expand", {
      query: { domain: input.domain, path: input.path },
    });
    return stripPassword(link);
  },
};

export default linkExpand;
