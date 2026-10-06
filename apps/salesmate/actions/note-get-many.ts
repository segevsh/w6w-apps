import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam, MODULES, type NoteModule, noteModuleOptions } from "../lib/params.ts";

interface Input {
  module: NoteModule;
  recordId: number;
}

const noteGetMany: ActionDefinition<Input> = {
  key: "note-get-many",
  type: "read",
  resource: "note",
  title: "List Notes",
  description: "List all notes of a record.",
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
  ],
  output: [{ key: "notes", type: "array", label: "Notes (shape as returned by Salesmate)" }],

  async execute(input, ctx) {
    const data = await new SalesmateClient(ctx).request(
      `/module/v4/modules/${MODULES[input.module].id}/objects/${input.recordId}/notes`,
    );
    return { notes: data };
  },
};

export default noteGetMany;
