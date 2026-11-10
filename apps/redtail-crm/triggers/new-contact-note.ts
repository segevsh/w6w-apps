import { pagedSnapshotTrigger } from "../lib/triggers.ts";
import noteList from "../actions/note-list.ts";

/**
 * The notes of one contact.
 * Redtail documents no sort order and no created-since filter on this list (TWAPI Documentation,
 * https://documenter.getpostman.com/view/7873823/SVzxXyzn), so each check reads every page
 * (`meta.total_pages`, at most 20) and diffs ids.
 */
export default pagedSnapshotTrigger({
  key: "new-contact-note",
  title: "New Contact Note",
  description: "The run gets each note newly logged against the chosen contact.",
  action: noteList,
  maxPages: 20,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      required: true,
      hint: "The Redtail contact to watch.",
    },
  ],
  input: (params) => ({ contactId: params.contactId }),
  items: (result) => (result as { notes?: unknown[] }).notes ?? [],
  output: [
    { key: "id", type: "number", label: "Note ID" },
    { key: "category", type: "string", label: "Category" },
    { key: "body", type: "string", label: "Body" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 2,
    category: "General Information",
    body: "Asked about a rollover",
    created_at: "2026-11-10T09:00:00.000Z",
  },
});
