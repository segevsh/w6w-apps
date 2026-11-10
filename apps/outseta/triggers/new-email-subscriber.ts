import action from "../actions/list-email-subscribers.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-email-subscriber",
  title: "New Email List Subscriber",
  description:
    "The run gets each person newly subscribed to the chosen Outseta email list (newest first).",
  action,
  output: [
    { key: "Uid", type: "string", label: "Subscription Uid" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: { Uid: "sb4Vc8Hy", Created: "2026-11-10T09:00:00Z" },
});
