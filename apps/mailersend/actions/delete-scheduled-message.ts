import { deleteById, seg } from "../lib/factories.ts";

export default deleteById({
  key: "delete-scheduled-message",
  resource: "scheduled-message",
  title: "Delete Scheduled Message",
  description: "Cancel a scheduled email before it is sent (DELETE /v1/message-schedules/{id}).",
  path: (id) => `/message-schedules/${seg(id)}`,
  idKey: "messageId",
  idLabel: "Message ID",
});
