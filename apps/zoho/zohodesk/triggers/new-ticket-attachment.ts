import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/ticket-attachment-list.ts";
import { dataOf, idOf, ORG_PARAM, TICKET_PARAM } from "../lib/triggers.ts";

/**
 * `GET /tickets/{id}/attachments` takes `sortBy=-createdTime` (a `-` prefix denotes descending), so page 1 is the newest attachments.
 * https://desk.zoho.com/DeskAPIDocument#TicketAttachments (verified 2026-11-10)
 */
export default pollFromListAction({
  key: "new-ticket-attachment",
  title: "New Ticket Attachment",
  description: "The run gets each new attachment on one Zoho Desk ticket, newest first.",
  action: action as never,
  params: [TICKET_PARAM, ORG_PARAM],
  input: (params: { ticketId?: string; orgId?: string }) => ({
    ticketId: String(params.ticketId ?? ""),
    orgId: params.orgId,
    limit: 100,
    sortBy: "-createdTime",
  }),
  items: dataOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Attachment ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "size", type: "string", label: "Size" },
    { key: "createdTime", type: "string", label: "Created time" },
  ],
  sample: {
    id: "1892000000096001",
    name: "screenshot.png",
    size: "20480",
    createdTime: "2026-11-09T12:15:00.000Z",
  },
});
