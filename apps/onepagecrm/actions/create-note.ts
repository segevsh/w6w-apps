import type { ActionDefinition } from "@w6w/types";
import { compact, OnePageClient, toList } from "../lib/client.ts";

interface Input {
  contactId: string;
  text: string;
  date?: string;
  linkedDealId?: string;
  userIdsToNotify?: string[] | string;
}

/** `POST /notes` — log a note against a contact (optionally linked to a deal). Not idempotent. */
const createNote: ActionDefinition<Input> = {
  key: "create-note",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Log a note against a contact, optionally linked to one of its deals.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "text", label: "Note", type: "text", required: true },
    { key: "date", label: "Date", type: "string", hint: "YYYY-MM-DD. Defaults to today." },
    { key: "linkedDealId", label: "Linked deal ID", type: "string" },
    {
      key: "userIdsToNotify",
      label: "User IDs to notify",
      type: "string",
      hint: "Comma-separated user ids.",
    },
  ],
  output: [{ key: "note", type: "object", label: "The created note" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data("/notes", {
      method: "POST",
      body: compact({
        contact_id: input.contactId,
        text: input.text,
        date: input.date,
        linked_deal_id: input.linkedDealId,
        user_ids_to_notify: toList(input.userIdsToNotify),
      }),
    });
  },
};

export default createNote;
