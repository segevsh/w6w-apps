import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  message: string;
}

/**
 * `POST /v1/document/revoke` — cancel a document that has not yet completed.
 * `message` is documented `required` (`minLength: 1`) — it is shown to
 * signers as the reason the document was withdrawn.
 */
const documentRevoke: ActionDefinition<Input> = {
  key: "document-revoke",
  type: "perform",
  resource: "document",
  title: "Revoke Document",
  description: "Cancel a document that has not yet completed.",
  idempotent: false,
  params: [
    documentIdParam,
    {
      key: "message",
      label: "Reason",
      type: "text",
      required: true,
      hint: "Shown to signers as the reason the document was withdrawn.",
    },
  ],
  output: [],

  execute(input, ctx) {
    return new BoldSignClient(ctx).request("/document/revoke", {
      method: "POST",
      query: { documentId: input.documentId },
      body: { message: input.message },
    });
  },
};

export default documentRevoke;
