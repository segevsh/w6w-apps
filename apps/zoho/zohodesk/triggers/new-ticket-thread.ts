import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/ticket-thread-list.ts";
import { dataOf, idOf, ORG_PARAM, TICKET_PARAM } from "../lib/triggers.ts";

/**
 * `GET /tickets/{id}/threads` sorts by `sendDateTime` and, when `sortBy` is not given, descending, so page 1 is the newest threads.
 * https://desk.zoho.com/DeskAPIDocument#Threads (verified 2026-11-10)
 */
export default pollFromListAction({
  key: "new-ticket-thread",
  title: "New Ticket Thread",
  description:
    "The run gets each new conversation thread (customer-facing message) on one Zoho Desk ticket, newest first.",
  action: action as never,
  params: [TICKET_PARAM, ORG_PARAM],
  input: (params: { ticketId?: string; orgId?: string }) => ({
    ticketId: String(params.ticketId ?? ""),
    orgId: params.orgId,
    limit: 100,
  }),
  items: dataOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Thread ID" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "channel", type: "string", label: "Channel" },
    { key: "createdTime", type: "string", label: "Created time" },
  ],
  sample: {
    id: "1892000000094001",
    summary: "Thanks, I can sign in now",
    direction: "in",
    channel: "EMAIL",
    createdTime: "2026-11-09T12:05:00.000Z",
  },
});
