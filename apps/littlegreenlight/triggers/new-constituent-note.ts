import noteList from "../actions/note-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-constituent-note",
  title: "New Constituent Note",
  description: "The run gets each note newly recorded against the chosen constituent.",
  action: noteList,
  params: [{
    key: "constituent_id",
    label: "Constituent ID",
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
    hint: "The constituent whose notes to watch.",
  }],
  output: [
    { key: "id", type: "number", label: "Note ID" },
    { key: "constituent_id", type: "number", label: "Constituent ID" },
    { key: "text", type: "string", label: "Note text" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 5001,
    constituent_id: 1001,
    text: "Called to confirm pledge",
    created_at: "2026-11-10T09:00:00Z",
  },
});
