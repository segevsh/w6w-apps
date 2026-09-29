import type { ActionDefinition } from "@w6w/types";
import { compact, RedtailClient } from "../lib/client.ts";
import type { RedtailNote, RedtailNoteInput } from "../lib/types.ts";

interface Input {
  contactId: number;
  body: string;
  categoryId?: number;
  noteType?: number;
  pinned?: boolean;
  draft?: boolean;
  notifyUserId?: number;
  notifyTeamId?: number;
}

interface Output {
  note: RedtailNote;
}

const noteCreate: ActionDefinition<Input, Output> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Contact Note",
  description: "Log a note against a contact.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
    { key: "body", label: "Note body", type: "text", required: true },
    {
      key: "categoryId",
      label: "Category ID",
      type: "number",
      advanced: true,
      hint: "From GET /lists/categories. The docs' own example uses 2 for General Information.",
    },
    {
      key: "noteType",
      label: "Note type",
      type: "number",
      advanced: true,
      hint: "The docs' own example uses 1 for a plain Note.",
    },
    { key: "pinned", label: "Pinned", type: "boolean" },
    { key: "draft", label: "Draft", type: "boolean" },
    {
      key: "notifyUserId",
      label: "Notify user ID",
      type: "number",
      advanced: true,
      hint: "Redtail database user id to notify about this note.",
    },
    { key: "notifyTeamId", label: "Notify team ID", type: "number", advanced: true },
  ],
  output: [
    { key: "note.id", type: "number", label: "Note ID" },
    { key: "note.body", type: "string", label: "Body" },
    { key: "note.created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const body: RedtailNoteInput = compact({
      body: input.body,
      category_id: input.categoryId,
      note_type: input.noteType,
      pinned: input.pinned,
      draft: input.draft,
      notify_user_id: input.notifyUserId,
      notify_team_id: input.notifyTeamId,
    }) as RedtailNoteInput;
    const res = await new RedtailClient(ctx).request<Output>(
      `/contacts/${input.contactId}/notes`,
      { method: "POST", body },
    );
    return res.data;
  },
};

export default noteCreate;
