import type { ActionDefinition } from "@w6w/types";
import { WebflowClient } from "../lib/client.ts";

interface Input {
  siteId: string;
}

/** GET /sites/{site_id} — fetch a single site's metadata. */
const getSite: ActionDefinition<Input> = {
  key: "get-site",
  type: "read",
  resource: "site",
  title: "Get Site",
  description: "Fetch a single Webflow site by its ID.",
  params: [
    { key: "siteId", label: "Site ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Site ID" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "shortName", type: "string", label: "Short name" },
    { key: "previewUrl", type: "string", label: "Preview URL" },
    { key: "timeZone", type: "string", label: "Time zone" },
    { key: "lastPublished", type: "string", label: "Last published" },
    { key: "lastUpdated", type: "string", label: "Last updated" },
    { key: "customDomains", type: "array", label: "Custom domains" },
    { key: "locales", type: "object", label: "Locales" },
  ],

  execute(input, ctx) {
    const client = new WebflowClient(ctx);
    return client.request(`/sites/${encodeURIComponent(input.siteId)}`);
  },
};

export default getSite;
