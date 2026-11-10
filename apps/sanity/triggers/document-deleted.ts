import { webhookTrigger } from "../lib/triggers.ts";

const documentDeleted = webhookTrigger({
  key: "document-deleted",
  title: "Document Deleted",
  operation: "delete",
  description:
    "Fires when a document is deleted (or unpublished) in the watched dataset (optionally narrowed by a GROQ filter). The run gets the delivered projection, the document id and type, the dataset, project and transaction details and an idempotency key.",
});

export default documentDeleted;
