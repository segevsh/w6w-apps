import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam, MODULES, type NoteModule, noteModuleOptions } from "../lib/params.ts";

interface Input {
  module: NoteModule;
  recordId: number;
  noteId: number;
}

/** `/{contact|company|deal|activity}/v4/modules/{moduleId}/object/{recordId}/notes` */
const base = (i: Input) =>
  `/${MODULES[i.module].path}/v4/modules/${MODULES[i.module].id}/object/${i.recordId}/notes`;

const noteDelete: ActionDefinition<Input> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete Note",
  description: "Delete a note from a record.",
  idempotent: false,
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
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "noteId", type: "number", label: "Note ID" },
  ],

  async execute(input, ctx) {
    await new SalesmateClient(ctx).request(`${base(input)}/${input.noteId}`, { method: "DELETE" });
    return { deleted: true, noteId: input.noteId };
  },
};

export default noteDelete;
