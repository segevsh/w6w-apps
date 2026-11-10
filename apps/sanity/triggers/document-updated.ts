import { webhookTrigger } from "../lib/triggers.ts";

const documentUpdated = webhookTrigger({
  key: "document-updated",
  title: "Document Updated",
  operation: "update",
  description:
    "Fires on every change to an existing document in the watched dataset (optionally narrowed by a GROQ filter). The run gets the document after the change, its id and type, the dataset, project and transaction details and an idempotency key.",
});

export default documentUpdated;
