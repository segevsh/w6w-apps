import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, compact, idPath, stringList } from "../lib/client.ts";

interface Input {
  id: string;
  emails: string;
  sendCopyToUser?: boolean;
  asCopy?: boolean;
  subject?: string;
}

const invoiceSendEmail: ActionDefinition<Input> = {
  key: "invoice-send-email",
  type: "perform",
  resource: "invoice",
  title: "Email Sales Invoice",
  description: "Send a sales invoice by email from Alegra.",
  idempotent: false,
  params: [
    { key: "id", label: "Invoice ID", type: "string", required: true },
    {
      key: "emails",
      label: "Recipients",
      type: "string",
      required: true,
      hint: "One address or several separated by commas.",
    },
    {
      key: "sendCopyToUser",
      label: "Send a copy to me",
      type: "boolean",
      hint: "Also email a copy to the user the API token belongs to.",
    },
    {
      key: "asCopy",
      label: "Send as copy",
      type: "boolean",
      hint: "Send the document marked as a copy rather than the original.",
    },
    { key: "subject", label: "Subject", type: "string", hint: "Alegra picks a default if empty." },
  ],
  output: [{ key: "code", type: "number", label: "Vendor result code" }],

  async execute(input, ctx) {
    const emails = stringList(input.emails);
    if (emails.length === 0) throw new Error("emails must contain at least one address");
    const client = new AlegraClient(ctx);
    return await client.request(`/invoices/${idPath(input.id)}/email`, {
      method: "POST",
      body: {
        emails,
        ...compact({
          sendCopyToUser: input.sendCopyToUser,
          invoiceType: input.asCopy ? "copy" : undefined,
        }),
        ...(input.subject ? { emailMessage: { subject: input.subject } } : {}),
      },
    });
  },
};

export default invoiceSendEmail;
