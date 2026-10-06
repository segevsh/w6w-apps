import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "get-message",
  resource: "message",
  title: "Get Message",
  description:
    "Read one message with its domain and the emails it created (GET /v1/messages/{id}). `emails` stays empty until the send has been processed.",
  path: (id) => `/messages/${seg(id)}`,
  idKey: "messageId",
  idLabel: "Message ID",
  idHint: "The `x-message-id` Send Email returned (`messageId`).",
});
