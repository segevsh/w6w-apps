import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";
import type { RedtailNote } from "../lib/types.ts";

interface Input {
  contactId: number;
}

interface Output {
  notes: RedtailNote[];
}

const noteList: ActionDefinition<Input, Output> = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List Contact Notes",
  description: "List the notes logged against a contact.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [{ key: "notes", type: "array", label: "Notes" }],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>(`/contacts/${input.contactId}/notes`);
    return { notes: res.data.notes ?? [] };
  },
};

export default noteList;
