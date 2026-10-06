import type { ActionDefinition } from "@w6w/types";
import { flag, VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/editlist.json` — Update a contact list. The vendor requires the name on every edit.
 */
interface Input {
  id: string;
  name: string;
  emailSubject?: string;
  replyTo?: string;
  fromEmail?: string;
  fromName?: string;
  doubleOptin?: boolean;
  communications?: boolean;
}

const listUpdate: ActionDefinition<Input> = {
  key: "list-update",
  type: "perform",
  resource: "list",
  title: "Update Contact List",
  description: "Update a contact list. The vendor requires the name on every edit.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "List ID",
      type: "string",
      required: true,
    },
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
    return await new VboutClient(ctx).post("emailmarketing/editlist", {
      id: input.id,
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

export default listUpdate;
