import type { ActionDefinition } from "@w6w/types";
import { compact, OutsetaClient } from "../lib/client.ts";

interface Input {
  subject: string;
  body: string;
  fromEmail: string;
  fromName?: string;
  sendAutoResponder?: boolean;
}

/** `POST /api/v1/support/cases` — Open a support case from a person, optionally sending the automatic acknowledgement. */
const createCase: ActionDefinition<Input> = {
  key: "create-case",
  type: "perform",
  resource: "support",
  title: "Create Support Case",
  description:
    "Open a support case from a person, optionally sending the automatic acknowledgement.",
  idempotent: false,
  params: [
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
    },
    {
      key: "body",
      label: "Body",
      type: "text",
      required: true,
    },
    {
      key: "fromEmail",
      label: "From email",
      type: "string",
      hint: "The requester's email address.",
      required: true,
    },
    {
      key: "fromName",
      label: "From first name",
      type: "string",
    },
    {
      key: "sendAutoResponder",
      label: "Send auto-responder",
      type: "boolean",
      hint: "Send the automatic 'your ticket was created' message.",
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/support/cases`, {
      method: "POST",
      query: { sendautoresponder: input.sendAutoResponder },
      body: {
        Subject: input.subject,
        Body: input.body,
        FromPerson: compact({ Email: input.fromEmail, FirstName: input.fromName }),
      },
    });
  },
};

export default createCase;
