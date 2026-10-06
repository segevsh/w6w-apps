import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
}

/** `GET /call_notes/{uuid}` */
const callNoteGet: ActionDefinition<Input> = {
  key: "call-note-get",
  type: "read",
  resource: "call-note",
  title: "Get Call Note",
  description: "Retrieve a single call note.",
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
    const res = await new LeexiClient(ctx).request("GET", `/call_notes/${seg(input.uuid)}`);
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default callNoteGet;
