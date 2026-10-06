import type { ActionDefinition } from "@w6w/types";
import { flag, VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/addlist.json` — Create a contact list.
 */
interface Input {
  name: string;
  emailSubject?: string;
  replyTo?: string;
  fromEmail?: string;
  fromName?: string;
  doubleOptin?: boolean;
  communications?: boolean;
}

const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create Contact List",
  description: "Create a contact list.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
    },
    {
      key: "emailSubject",
      label: "Default Subscription Subject",
      type: "string",
    },
    {
      key: "replyTo",
      label: "Reply-To Email",
      type: "string",
    },
    {
      key: "fromEmail",
      label: "From Email",
      type: "string",
    },
    {
      key: "fromName",
      label: "From Name",
      type: "string",
    },
    {
      key: "doubleOptin",
      label: "Double Opt-in",
      type: "boolean",
      hint: "Require email confirmation before a subscriber is active.",
    },
    {
      key: "communications",
      label: "Turn Off Communications",
      type: "boolean",
    },
  ],
  output: [
    {
      key: "ok",
      type: "boolean",
      label:
        "True when VBOUT accepted the request. Any fields VBOUT returns for the record (e.g. a created record's details) are merged in.",
    },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).post("emailmarketing/addlist", {
      name: input.name,
      email_subject: input.emailSubject,
      reply_to: input.replyTo,
      fromemail: input.fromEmail,
      from_name: input.fromName,
      doubleOptin: flag(input.doubleOptin),
      communications: flag(input.communications),
    });
  },
};

export default listCreate;
