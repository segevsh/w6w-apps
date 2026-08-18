import type { ActionDefinition } from "@w6w/types";
import { StatuspageClient } from "../lib/client.ts";

/**
 * `GET /pages` — the pages this API key can reach.
 *
 * The only call that needs no page id, which makes it both the connection test
 * and the answer to "why does my write 404": a key issued on one Statuspage
 * account cannot touch another's page, and a wrong page id looks exactly like a
 * permissions problem.
 *
 * `subdomain` and `domain` are what a workflow needs to link customers to the
 * page it just updated — `acme.statuspage.io`, or the custom domain if one is
 * configured.
 */
const action: ActionDefinition = {
  key: "page-list",
  type: "read",
  resource: "page",
  title: "List pages",
  description:
    "Pages this API key can reach, with their ids and public URLs. The only call needing no " +
    "page id, and the answer to why a write 404s.",
  params: [],
  output: [
    { key: "pages", type: "array", label: "Pages" },
  ],

  async execute(_input, ctx) {
    const pages = await new StatuspageClient(ctx).request<unknown[]>("/pages");
    return { pages };
  },
};

export default action;
