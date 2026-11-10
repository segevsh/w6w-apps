import type { ActionDefinition } from "@w6w/types";
import emailInboxList from "../actions/email-inbox-list.ts";
import { pickParams, snapshotTrigger } from "../lib/triggers.ts";

const action = emailInboxList as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-email-inbox",
  title: "New Email Inbox",
  description:
    "The run gets each email inbox newly created in the account, read as a whole through email-inbox-list (the endpoint is an unpaginated list).",
  action,
  params: pickParams(action, []),
  sample: { id: "d25a64c9", alias: "support", title: "Support" },
});
