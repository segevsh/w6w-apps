import { eventTrigger } from "../lib/triggers.ts";

export default eventTrigger({
  key: "note-deleted",
  title: "Note Deleted",
  event: "note.deleted",
  noun: "note",
  sampleBody: { "id": 5, "creator_id": 38603, "person_ids": [38706], "content": "Intro call" },
});
