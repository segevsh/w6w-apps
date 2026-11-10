import type { ActionDefinition } from "@w6w/types";
import ticketFormKnowledgeList from "../actions/ticket-form-knowledge-list.ts";
import { pickParams, snapshotTrigger } from "../lib/triggers.ts";

const action = ticketFormKnowledgeList as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-ticket-form-knowledge",
  title: "New Ticket Form Knowledge",
  description:
    "The run gets each knowledge item newly attached to a ticket form, read as a whole through ticket-form-knowledge-list.",
  action,
  params: pickParams(action, ["ticketFormId"]),
  sample: { id: "d38b8600-sample", type: "website", base_url: "https://example.com/" },
});
