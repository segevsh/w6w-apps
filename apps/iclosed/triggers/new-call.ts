import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

/**
 * `GET /v1/eventCalls` sorted by `createdAt` descending, every time window (`eventType=ALL`)
 * (https://developer.iclosed.io, OpenAPI `Get Calls`, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-call",
  title: "New Call",
  description: "The run gets each call newly booked in iClosed.",
  action: callList,
  input: () => ({
    eventType: "ALL",
    orderColumn: "createdAt",
    orderBy: "desc",
    limit: 100,
    page: 0,
  }),
  items: (result) => (result as { data?: { eventCalls?: unknown[] } }).data?.eventCalls ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [
    { key: "id", type: "number", label: "Call ID" },
    { key: "eventId", type: "number", label: "Event ID" },
    { key: "contactId", type: "number", label: "Contact ID" },
    { key: "dateTime", type: "string", label: "Call time" },
    { key: "inviteeName", type: "string", label: "Invitee name" },
    { key: "inviteeEmail", type: "string", label: "Invitee email" },
    { key: "createdAt", type: "string", label: "Booked at" },
  ],
  sample: {
    id: 4412,
    eventId: 31,
    contactId: 9087,
    dateTime: "2026-11-12T15:00:00.000Z",
    inviteeName: "Ada Lovelace",
    inviteeEmail: "ada@example.test",
    createdAt: "2026-11-10T09:30:00.000Z",
    updatedAt: "2026-11-10T09:30:00.000Z",
  },
});
