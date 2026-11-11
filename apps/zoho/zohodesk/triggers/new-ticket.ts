import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/ticket-list.ts";
import { dataOf, idOf, ORG_PARAM } from "../lib/triggers.ts";

/**
 * `GET /tickets` takes `sortBy=-createdTime` ("Key that sorts the tickets by a specific attribute:
 * dueDate, recentThread, createdTime, or ticketNumber ... A `-` prefix denotes a descending order",
 * https://desk.zoho.com/DeskAPIDocument#Tickets, 2026-11-10), so page 1 is the newest tickets.
 */
export default pollFromListAction({
  key: "new-ticket",
  title: "New Ticket",
  description: "The run gets each newly created Zoho Desk ticket, newest first.",
  action,
  params: [ORG_PARAM],
  input: (params: { orgId?: string }) => ({
    orgId: params.orgId,
    limit: 100,
    sortBy: "-createdTime",
  }),
  items: dataOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Ticket ID" },
    { key: "ticketNumber", type: "string", label: "Ticket number" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
    { key: "departmentId", type: "string", label: "Department ID" },
    { key: "contactId", type: "string", label: "Contact ID" },
    { key: "createdTime", type: "string", label: "Created time" },
  ],
  sample: {
    id: "1892000000093001",
    ticketNumber: "101",
    subject: "Cannot sign in",
    status: "Open",
    departmentId: "1892000000006907",
    contactId: "1892000000091433",
    createdTime: "2026-11-09T12:00:00.000Z",
  },
});
