import type { ActionDefinition } from "@w6w/types";
import { compact, LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
  locale: string;
  text: string;
}

/** `PATCH /call_notes/{uuid}` */
const callNoteUpdate: ActionDefinition<Input> = {
  key: "call-note-update",
  type: "perform",
  resource: "call-note",
  title: "Update Call Note",
  description: "Replace the text of one translation of a call note.",
  idempotent: true,
  params: [
    {
      key: "uuid",
      label: "Call note UUID",
      type: "string",
      required: true,
    },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      required: true,
      hint: "The locale of the translation to update, e.g. `en-US`.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "The new translated text.",
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
    const res = await new LeexiClient(ctx).request("PATCH", `/call_notes/${seg(input.uuid)}`, {
      body: compact({ locale: input.locale, text: input.text }),
    });
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default callNoteUpdate;
