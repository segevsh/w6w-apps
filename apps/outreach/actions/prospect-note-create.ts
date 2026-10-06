import { createAction } from "../lib/factory.ts";

export default createAction({
  key: "prospect-note-create",
  title: "Create Prospect Note",
  noun: "Prospect Note",
  type: "prospectNote",
  path: "prospectNotes",
  description: "Attach a note to a prospect.",
  attrParams: [
    { key: "message", label: "Message", type: "text", required: true },
    {
      key: "noteType",
      label: "Note type",
      type: "select",
      options: [
        { value: "note", label: "Note" },
        { value: "call", label: "Call" },
        { value: "coffee", label: "Coffee" },
        { value: "beer", label: "Beer" },
        { value: "meeting", label: "Meeting" },
      ],
    },
    { key: "pinned", label: "Pinned", type: "boolean" },
  ],
  relParams: [{ param: "prospectId", rel: "prospect", type: "prospect" }],
  relFieldParams: [
    {
      key: "prospectId",
      label: "Prospect ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
});
