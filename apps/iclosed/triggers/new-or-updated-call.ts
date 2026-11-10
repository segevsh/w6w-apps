import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

/**
 * Same endpoint as `new-call`, sorted by `updatedAt` descending (the sort column enum is
 * `createdAt | dateTime | updatedAt | id`); the dedupe id carries `updatedAt`, so a rescheduled
 * or re-outcomed call is a new event (https://developer.iclosed.io, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-or-updated-call",
  title: "New or Updated Call",
  description: "The run gets each iClosed call that is booked or changed, once per change.",
  action: callList,
  input: () => ({
    eventType: "ALL",
    orderColumn: "updatedAt",
    orderBy: "desc",
    limit: 100,
    page: 0,
  }),
  items: (result) => (result as { data?: { eventCalls?: unknown[] } }).data?.eventCalls ?? [],
  idOf: (item) => {
    const call = item as { id: unknown; updatedAt?: unknown };
    return `${String(call.id)}:${String(call.updatedAt ?? "")}`;
  },
  output: [
    { key: "id", type: "number", label: "Call ID" },
    { key: "contactId", type: "number", label: "Contact ID" },
    { key: "dateTime", type: "string", label: "Call time" },
    { key: "inviteeEmail", type: "string", label: "Invitee email" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 4412,
    eventId: 31,
    contactId: 9087,
    dateTime: "2026-11-13T15:00:00.000Z",
    inviteeEmail: "ada@example.test",
    createdAt: "2026-11-10T09:30:00.000Z",
    updatedAt: "2026-11-10T11:00:00.000Z",
  },
});
