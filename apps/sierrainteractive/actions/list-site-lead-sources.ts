import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/siteLeadSources` - lists the lead sources per site. */
export default lookupAction({
  key: "list-site-lead-sources",
  title: "List Site Lead Sources",
  description: "List the lead sources per site.",
  path: "/zapier/siteLeadSources",
});
