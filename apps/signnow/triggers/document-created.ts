import { webhookTrigger } from "../lib/triggers.ts";

const documentCreated = webhookTrigger({
  key: "document-created",
  title: "Document Created",
  event: "user.document.create",
  description:
    "Fires when the connected SignNow user creates a document. The run gets the event name, timestamp, document id and name, user id and the full event content.",
});

export default documentCreated;
