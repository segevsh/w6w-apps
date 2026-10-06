import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "get-scheduled-message",
  resource: "scheduled-message",
  title: "Get Scheduled Message",
  description:
    "Read one scheduled message (GET /v1/message-schedules/{id}): `send_at`, `status`, `status_message`, its domain and message.",
  path: (id) => `/message-schedules/${seg(id)}`,
  idKey: "messageId",
  idLabel: "Message ID",
  idHint: "The `x-message-id` of the scheduled send, or `message_id` from List Scheduled Messages.",
});
