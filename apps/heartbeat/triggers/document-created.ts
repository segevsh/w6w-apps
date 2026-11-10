import { webhookTrigger } from "../lib/triggers.ts";

/** A document is created (action `DOCUMENT_CREATE`). */
const documentCreated = webhookTrigger({
  key: "document-created",
  title: "New Document",
  description:
    "Fires when a document is created in the Heartbeat wiki (action DOCUMENT_CREATE). The run gets the document id; Get Document returns the content.",
  action: "DOCUMENT_CREATE",
  output: [{ key: "id", type: "string", label: "Document ID" }],
  sample: { action: "DOCUMENT_CREATE", id: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601" },
});

export default documentCreated;
