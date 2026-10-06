import type { ActionDefinition } from "@w6w/types";
import { LeexiClient } from "../lib/client.ts";

interface Input {
  call_uuid: string;
  prompt_uuid?: string;
  page?: number;
  items?: number;
}

/** `GET /call_notes` */
const callNoteList: ActionDefinition<Input> = {
  key: "call-note-list",
  type: "search",
  resource: "call-note",
  title: "List Call Notes",
  description: "List the notes (AI completions with their translations) of one call.",
  params: [
    {
      key: "call_uuid",
      label: "Call UUID",
      type: "string",
      required: true,
    },
    {
      key: "prompt_uuid",
      label: "Prompt UUID",
      type: "string",
      hint: "Only the notes of this prompt.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "First page is 1.",
      validation: { min: 1, integer: true },
    },
    {
      key: "items",
      label: "Items per page",
      type: "number",
      hint: "1-100, defaults to 10.",
      validation: { min: 1, max: 100, integer: true },
    },
  ],
  output: [
    { key: "data", type: "array", label: "The records on this page" },
    {
      key: "pagination",
      type: "object",
      label: "{ page, items, count, pages } — stop when page reaches pages",
    },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("GET", "/call_notes", {
      query: {
        call_uuid: input.call_uuid,
        prompt_uuid: input.prompt_uuid,
        page: input.page,
        items: input.items,
      },
    });
    return { data: res.data ?? [], pagination: res.pagination ?? null };
  },
};

export default callNoteList;
