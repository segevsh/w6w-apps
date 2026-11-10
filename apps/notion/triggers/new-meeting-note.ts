import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/query-meeting-notes.ts";

const trigger = pollFromListAction({
  key: "new-meeting-note",
  title: "New Meeting Note",
  description:
    "The run gets each meeting notes block (a meeting the connected user attended) created since the previous check, newest first.",
  action,
  input: () => ({ sort: [{ property: "created_time", direction: "descending" }], limit: 25 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Meeting notes block ID" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "last_edited_time", type: "string", label: "Last edited time" },
    { key: "meeting_notes", type: "object", label: "Meeting notes" },
  ],
  sample: {
    "object": "block",
    "id": "c0ffee00-1111-4222-8333-444455556666",
    "type": "meeting_notes",
    "created_time": "2026-11-10T07:00:00.000Z",
    "last_edited_time": "2026-11-10T08:00:00.000Z",
    "meeting_notes": {
      "title": [
        {
          "type": "text",
          "plain_text": "Weekly sync",
        },
      ],
      "status": "notes_ready",
    },
  },
  maxPages: 1,
});

export default trigger;
