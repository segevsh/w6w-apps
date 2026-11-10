import type { Param } from "@w6w/types";
import { boundedList } from "../lib/triggers.ts";
import reservationMessagesList from "../actions/reservation-messages-list.ts";

const RESERVATION_ID: Param = {
  key: "reservationId",
  label: "Reservation UUID",
  type: "string",
  required: true,
  hint: "The reservation whose conversation to watch (from List Reservations).",
};

export default boundedList({
  key: "new-reservation-message",
  title: "New Reservation Message",
  description: "The run gets each message newly added to one reservation's conversation.",
  action: reservationMessagesList as never,
  paged: false,
  params: [RESERVATION_ID],
  input: (params) => ({ uuid: String(params.reservationId).trim() }),
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "body", type: "string", label: "Message text" },
    { key: "sender_type", type: "string", label: "Sender type" },
    { key: "created_at", type: "string", label: "Sent at" },
  ],
  sample: {
    id: "message-1",
    body: "What time is check-in?",
    sender_type: "guest",
    created_at: "2026-11-10T09:30:00Z",
  },
});
