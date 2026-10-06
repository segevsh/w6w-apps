import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/sites` - lists the sites (the ids the other lists and lead requests filter by). */
export default lookupAction({
  key: "list-sites",
  title: "List Sites",
  description: "List the sites (the ids the other lists and lead requests filter by).",
  path: "/zapier/sites",
});
