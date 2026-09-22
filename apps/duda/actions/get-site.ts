import type { ActionDefinition } from "@w6w/types";
import { DudaClient, seg } from "../lib/client.ts";

/**
 * `GET /api/sites/multiscreen/{siteName}` — "Get site".
 *
 * One `DudaOneSiteRetrieveRDT`, the same object a `list-sites` result carries:
 * the alias, the owning account, the publish status, the dates, and the
 * preview/edit URLs for the site. Duda's own note applies here too — a site
 * whose status is 'In Planning' is not returned.
 */
const getSite: ActionDefinition<{ siteName: string }> = {
  key: "get-site",
  type: "read",
  resource: "site",
  title: "Get Site",
  description: "Fetch one site by its `site_name` alias.",
  params: [
    {
      key: "siteName",
      label: "Site name",
      type: "string",
      required: true,
      placeholder: "abc1234d",
      hint: "Duda's site alias (`site_name`) — the unique string every other site endpoint takes.",
    },
  ],
  output: [
    { key: "site_name", type: "string", label: "Site name (alias)" },
    { key: "account_name", type: "string", label: "Owning account" },
    { key: "publish_status", type: "string", label: "Publish status" },
    { key: "site_domain", type: "string", label: "Site domain" },
    { key: "preview_site_url", type: "string", label: "Preview URL" },
    { key: "creation_date", type: "string", label: "Created at" },
    { key: "last_published_date", type: "string", label: "Last published at" },
  ],

  execute(input, ctx) {
    return new DudaClient(ctx).request(`/api/sites/multiscreen/${seg(input.siteName)}`);
  },
};

export default getSite;
