import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/getStartNextDayValues` - lists the accepted values for the start-next-day field of an action plan apply. */
export default lookupAction({
  key: "list-start-next-day-values",
  title: "List Start-Next-Day Values",
  description: "List the accepted values for the start-next-day field of an action plan apply.",
  path: "/zapier/getStartNextDayValues",
});
