import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient, compact } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  message?: string;
  receiverEmails?: string[];
}

/**
 * `POST /v1/document/remind` — send a reminder email to signers still
 * pending. `receiverEmails` narrows it to specific signers; omitted, BoldSign
 * reminds everyone still pending.
 */
const documentRemind: ActionDefinition<Input> = {
  key: "document-remind",
  type: "perform",
  resource: "document",
  title: "Send Reminder",
  description: "Send a reminder email to a document's pending signers.",
  idempotent: false,
  params: [
    documentIdParam,
    {
      key: "receiverEmails",
      label: "Recipients",
      type: "array",
      item: { type: "string", placeholder: "someone@example.com" },
      hint: "Limit the reminder to these signers. Leave empty to remind everyone still pending.",
    },
    { key: "message", label: "Message", type: "text" },
  ],
  output: [],

  execute(input, ctx) {
    return new BoldSignClient(ctx).request("/document/remind", {
      method: "POST",
      query: { documentId: input.documentId, receiverEmails: input.receiverEmails },
      body: compact({ message: input.message }),
    });
  },
};

export default documentRemind;
