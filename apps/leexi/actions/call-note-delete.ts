import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
}

/** `DELETE /call_notes/{uuid}` */
const callNoteDelete: ActionDefinition<Input> = {
  key: "call-note-delete",
  type: "perform",
  resource: "call-note",
  title: "Delete Call Note",
  description: "Delete a call note.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Call note UUID",
      type: "string",
      required: true,
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The record returned by Leexi (empty object for a delete)",
    },
    { key: "message", type: "string", label: "Leexi's confirmation message" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("DELETE", `/call_notes/${seg(input.uuid)}`);
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default callNoteDelete;
