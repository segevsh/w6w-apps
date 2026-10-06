import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam, MODULES, type NoteModule, noteModuleOptions } from "../lib/params.ts";

interface Input {
  module: NoteModule;
  recordId: number;
  noteId: number;
  note: string;
  attachments?: unknown;
}

/** `/{contact|company|deal|activity}/v4/modules/{moduleId}/object/{recordId}/notes` */
const base = (i: Input) =>
  `/${MODULES[i.module].path}/v4/modules/${MODULES[i.module].id}/object/${i.recordId}/notes`;

const noteUpdate: ActionDefinition<Input> = {
  key: "note-update",
  type: "perform",
  resource: "note",
  title: "Update Note",
  description: "Replace the text of an existing note.",
  idempotent: true,
  params: [
    {
      key: "module",
      label: "Record type",
      type: "select",
      required: true,
      row: "target",
      options: noteModuleOptions,
    },
    { ...idParam("recordId", "Record ID"), row: "target" },
    idParam("noteId", "Note ID"),
    {
      key: "note",
      label: "Note",
      type: "text",
      required: true,
      hint: "HTML, e.g. <div>Called back.</div>",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      advanced: true,
      hint: "Array of attachment objects as the Salesmate UI uploads them; leave empty for none.",
    },
  ],
  output: [
    { key: "updated", type: "boolean", label: "Updated" },
    { key: "noteId", type: "number", label: "Note ID" },
  ],

  async execute(input, ctx) {
    const attachments = typeof input.attachments === "string" && input.attachments
      ? JSON.parse(input.attachments)
      : input.attachments ?? [];
    await new SalesmateClient(ctx).request(`${base(input)}/${input.noteId}`, {
      method: "PUT",
      body: { note: input.note, attachments, type: "Note" },
    });
    return { updated: true, noteId: input.noteId };
  },
};

export default noteUpdate;
