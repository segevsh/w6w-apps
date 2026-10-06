import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/tags` - lists the lead tags. */
export default lookupAction({
  key: "list-tags",
  title: "List Tags",
  description: "List the lead tags.",
  path: "/zapier/tags",
});
