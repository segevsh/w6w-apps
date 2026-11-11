import type { ActionDefinition } from "@w6w/types";
import { listSnapshot } from "../lib/triggers.ts";
import noteList from "../actions/note-list.ts";

/** No sort or since filter exists on this endpoint (Lofty OpenAPI, https://api.lofty.com/docs/), so the list is diffed by id. */
export default listSnapshot({
  key: "new-note",
  title: "New Note",
  description: "The run gets each new note on one lead: note id, author, text and time.",
  action: noteList as unknown as ActionDefinition,
  listKey: "notes",
  idKey: "noteId",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "number",
      required: true,
      hint: "The lead to watch, from List Leads or New Lead.",
    },
  ],
  input: (params) => ({ leadId: params.leadId }),
  output: [
    { key: "noteId", type: "number", label: "Note ID" },
    { key: "leadId", type: "number", label: "Lead ID" },
    { key: "creatorId", type: "number", label: "Author user ID" },
    { key: "content", type: "string", label: "Note text" },
    { key: "createTime", type: "string", label: "Created at" },
  ],
  sample: {
    id: 111,
    noteId: 400000012345,
    leadId: 651095960136641,
    creatorId: 100234,
    content: "Called, wants a showing",
    createTime: "2026-11-10 09:00:00",
  },
});
