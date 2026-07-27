import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  siteId: string;
}

/**
 * GET /sites/{site_id}/collections — list the CMS collections of a site. The
 * response is `{ collections: [...] }`.
 */
const listCollections: ActionDefinition<Input> = {
  key: "list-collections",
  type: "read",
  resource: "collection",
  title: "List Collections",
  description: "List all CMS collections belonging to a site.",
  params: [
    { key: "siteId", label: "Site ID", type: "string", required: true },
  ],
  output: [
    { key: "collections", type: "array", label: "Collections" },
  ],

  execute(input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request(`/sites/${encodeURIComponent(input.siteId)}/collections`);
  },
};

export default listCollections;
