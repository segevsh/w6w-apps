import { webhookTrigger } from "../lib/triggers.ts";

/** A recipient signs a document (event `document_signed`), once per signer. */
const documentSigned = webhookTrigger({
  key: "document-signed",
  title: "Document Signed",
  description:
    "Fires each time a recipient signs a SignWell document (event document_signed); a document with several recipients fires once per signer. The run gets the event type and time, the signer's name and email, the document id, name and status, the account id and the full document.",
  events: ["document_signed"],
  sample: {
    type: "document_signed",
    status: "Pending",
    relatedSigner: { name: "Ada Lovelace", email: "ada@example.com" },
  },
});

export default documentSigned;
