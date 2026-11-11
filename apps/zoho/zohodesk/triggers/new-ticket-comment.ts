import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/ticket-comment-list.ts";
import { dataOf, idOf, ORG_PARAM, TICKET_PARAM } from "../lib/triggers.ts";

/**
 * `GET /tickets/{id}/comments` takes `sortBy=-commentedTime` (a `-` prefix denotes descending), so page 1 is the newest comments.
 * https://desk.zoho.com/DeskAPIDocument#TicketComments (verified 2026-11-10)
 */
export default pollFromListAction({
  key: "new-ticket-comment",
  title: "New Ticket Comment",
  description: "The run gets each new comment on one Zoho Desk ticket, newest first.",
  action: action as never,
  params: [TICKET_PARAM, ORG_PARAM],
  input: (params: { ticketId?: string; orgId?: string }) => ({
    ticketId: String(params.ticketId ?? ""),
    orgId: params.orgId,
    limit: 100,
    sortBy: "-commentedTime",
  }),
  items: dataOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "commentedTime", type: "string", label: "Commented time" },
    { key: "commenterId", type: "string", label: "Commenter ID" },
  ],
  sample: {
    id: "1892000000095001",
    content: "Checked the logs",
    commentedTime: "2026-11-09T12:10:00.000Z",
    commenterId: "1892000000056007",
  },
});
