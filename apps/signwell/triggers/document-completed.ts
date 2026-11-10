import { webhookTrigger } from "../lib/triggers.ts";

/** A document is signed by every recipient (event `document_completed`). */
const documentCompleted = webhookTrigger({
  key: "document-completed",
  title: "Document Completed",
  description:
    "Fires when a SignWell document is completed (signed by all recipients; event document_completed). The run gets the event type and time, the document id, name and status, the account id and the full document.",
  events: ["document_completed"],
});

export default documentCompleted;
