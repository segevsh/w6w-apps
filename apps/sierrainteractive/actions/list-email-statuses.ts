import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/emailStatus` - lists the email statuses. */
export default lookupAction({
  key: "list-email-statuses",
  title: "List Email Statuses",
  description: "List the email statuses.",
  path: "/zapier/emailStatus",
});
