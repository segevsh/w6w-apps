import { webhookTrigger } from "../lib/triggers.ts";

const documentCompleted = webhookTrigger({
  key: "document-completed",
  title: "Document Completed",
  event: "user.document.complete",
  description:
    "Fires when every required field on one of the connected user's documents has been filled in. The run gets the event name, timestamp, document id and name, user id and the full event content.",
});

export default documentCompleted;
