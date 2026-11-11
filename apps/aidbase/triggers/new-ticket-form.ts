import type { ActionDefinition } from "@w6w/types";
import ticketFormList from "../actions/ticket-form-list.ts";
import { pickParams, snapshotTrigger } from "../lib/triggers.ts";

const action = ticketFormList as unknown as ActionDefinition;

export default snapshotTrigger({
  key: "new-ticket-form",
  title: "New Ticket Form",
  description:
    "The run gets each ticket form newly created in the account, read as a whole through ticket-form-list (the endpoint is an unpaginated list).",
  action,
  params: pickParams(action, []),
  sample: { id: "f162e570", public_id: "form-sample", title: "Support Tickets" },
});
