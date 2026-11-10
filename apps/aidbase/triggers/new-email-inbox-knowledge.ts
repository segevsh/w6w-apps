import type { ActionDefinition } from "@w6w/types";
import emailInboxKnowledgeList from "../actions/email-inbox-knowledge-list.ts";
import { pickParams, snapshotTrigger } from "../lib/triggers.ts";

const action = emailInboxKnowledgeList as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-email-inbox-knowledge",
  title: "New Email Inbox Knowledge",
  description:
    "The run gets each knowledge item newly attached to an email inbox, read as a whole through email-inbox-knowledge-list.",
  action,
  params: pickParams(action, ["emailInboxId"]),
  sample: { id: "d38b8600-sample", type: "website", base_url: "https://example.com/" },
});
