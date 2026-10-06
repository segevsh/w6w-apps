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

const notePin: ActionDefinition<Input> = {
  key: "note-pin",
  type: "perform",
  resource: "note",
  title: "Pin Note",
  description: "Pin a note to the top of its record.",
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
    await new SalesmateClient(ctx).request(`${base(input)}/${input.noteId}/pin-it`, {
      method: "PATCH",
      body: {},
    });
    return { pinned: true, noteId: input.noteId };
  },
};

export default notePin;
