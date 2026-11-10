import { postingTrigger } from "../lib/triggers.ts";

export default postingTrigger({
  key: "new-posting",
  title: "New Posting",
  description:
    "The run gets each newly created job posting (any state), found by comparing the account's `posting-list` result with the previous check.",
  updated: false,
});
