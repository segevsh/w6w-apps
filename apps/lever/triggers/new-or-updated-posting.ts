import { postingTrigger } from "../lib/triggers.ts";

export default postingTrigger({
  key: "new-or-updated-posting",
  title: "New or Updated Posting",
  description:
    "The run gets each job posting that is new or has changed since the last check (a state change or an edit), with a `change` field of added or updated.",
  updated: true,
});
