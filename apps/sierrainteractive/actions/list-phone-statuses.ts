import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/phoneStatus` - lists the phone statuses. */
export default lookupAction({
  key: "list-phone-statuses",
  title: "List Phone Statuses",
  description: "List the phone statuses.",
  path: "/zapier/phoneStatus",
});
