import { webhookTrigger } from "../lib/triggers.ts";

/** A document finishes parsing in an inbox with a webhook. */
const documentParsed = webhookTrigger({
  key: "document-parsed",
  title: "Document Parsed",
  description:
    "Fires when Airparser finishes parsing a document and delivers it to the webhook. The run gets the document id, name, status, timestamps, credits used and the extracted data.",
  sample: {
    documentId: "67d0d4c4b6b2a1f0c9e8d7a6",
    name: "invoice.pdf",
    filename: "invoice.pdf",
    contentType: "application/pdf",
    status: "parsed",
    createdAt: "2026-11-10T12:00:00.000Z",
    processedAt: "2026-11-10T12:00:04.321Z",
    credits: 1,
    json: { invoice_number: "INV-001", total: 150 },
    payload: {
      _id: "67d0d4c4b6b2a1f0c9e8d7a6",
      name: "invoice.pdf",
      status: "parsed",
      json: { invoice_number: "INV-001", total: 150 },
    },
  },
});

export default documentParsed;
