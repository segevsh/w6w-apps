import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient, encodeId } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  contactId: string;
  note: string;
}

const action: ActionDefinition<Input> = {
  key: "contact-note-create",
  type: "perform",
  resource: "contact",
  title: "Add Contact Note",
  description: "Add a note to a contact. AccuLynx answers 201 with no body.",
  idempotent: false,
  params: [
    idParam("contactId", "Contact id"),
    { key: "note", label: "Note", type: "text", required: true },
  ],
  output: [{
    key: "success",
    type: "boolean",
    label: "True when AccuLynx accepted the request (it answers with no body)",
  }],

  async execute(input, ctx) {
    return await new AccuLynxClient(ctx).send(`/contacts/${encodeId(input.contactId)}/notes`, {
      method: "POST",
      body: { note: input.note },
    });
  },
};

export default action;
