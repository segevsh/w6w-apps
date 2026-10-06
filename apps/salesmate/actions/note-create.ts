import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam, MODULES, type NoteModule, noteModuleOptions } from "../lib/params.ts";

interface Input {
  module: NoteModule;
  recordId: number;
  note: string;
  attachments?: unknown;
}

/** `/{contact|company|deal|activity}/v4/modules/{moduleId}/object/{recordId}/notes` */
const base = (i: Input) =>
  `/${MODULES[i.module].path}/v4/modules/${MODULES[i.module].id}/object/${i.recordId}/notes`;

const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Add a note to a contact, company, deal or activity.",
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
  output: [{ key: "noteId", type: "number", label: "Note ID" }],

  async execute(input, ctx) {
    const attachments = typeof input.attachments === "string" && input.attachments
      ? JSON.parse(input.attachments)
      : input.attachments ?? [];
    const data = await new SalesmateClient(ctx).request<{ noteId?: number }>(base(input), {
      method: "POST",
      body: { note: input.note, attachments, type: "Note" },
    });
    return { noteId: data?.noteId };
  },
};

export default noteCreate;
