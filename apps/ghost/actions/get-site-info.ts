import type { ActionDefinition } from "@w6w/types";
import { GhostClient } from "../lib/client.ts";

/**
 * `GET /site/` needs no credential at all — it is the one Admin API route
 * Ghost itself does not require a JWT for (see `lib/client.ts#site`). Marked
 * `requiresAuth: false` so it also works to sanity-check a `siteUrl` before a
 * Connection exists.
 */
const getSiteInfo: ActionDefinition<Record<string, never>> = {
  key: "get-site-info",
  type: "read",
  resource: "site",
  title: "Get Site Info",
  description: "Read the site's public title, description, logo and Ghost version. No auth needed.",
  requiresAuth: false,
  params: [],
  output: [
    { key: "title", type: "string", label: "Site title" },
    { key: "version", type: "string", label: "Ghost version" },
  ],

  execute(_input, ctx) {
    const client = GhostClient.fromConnection(ctx);
    return client.site();
  },
};

export default getSiteInfo;
