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

const noteUnpin: ActionDefinition<Input> = {
  key: "note-unpin",
  type: "perform",
  resource: "note",
  title: "Unpin Note",
  description: "Unpin a previously pinned note.",
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
  ],
  output: [
    { key: "pinned", type: "boolean", label: "Pinned" },
    { key: "noteId", type: "number", label: "Note ID" },
  ],

  async execute(input, ctx) {
    await new SalesmateClient(ctx).request(`${base(input)}/${input.noteId}/unpin-it`, {
      method: "PATCH",
      body: {},
    });
    return { pinned: false, noteId: input.noteId };
  },
};

export default noteUnpin;
