import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

/**
 * GET /sites — list every site the token can access. The response is
 * `{ sites: [...] }`; returned verbatim so downstream steps can read `sites`.
 */
const listSites: ActionDefinition<Record<string, never>> = {
  key: "list-sites",
  type: "read",
  resource: "site",
  title: "List Sites",
  description: "List all Webflow sites accessible with this connection.",
  params: [],
  output: [
    { key: "sites", type: "array", label: "Sites" },
  ],

  execute(_input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request("/sites");
  },
};

export default listSites;
