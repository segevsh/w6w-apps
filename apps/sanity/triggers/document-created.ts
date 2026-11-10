import { webhookTrigger } from "../lib/triggers.ts";

const documentCreated = webhookTrigger({
  key: "document-created",
  title: "Document Created",
  operation: "create",
  description:
    "Fires when a document is created in the watched dataset (optionally narrowed by a GROQ filter). The run gets the document, its id and type, the dataset, project and transaction details and an idempotency key.",
});

export default documentCreated;
