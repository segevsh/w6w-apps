import type { ActionDefinition } from "@w6w/types";
import noteRelationshipList from "../actions/note-relationship-list.ts";
import { listPages, snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/notes/{id}/relationships` for the note the user picks: one note's customer/entity links
// are a small bounded collection (brief 9.1c). A relationship has no id of its own; its identity
// is `type` + target id.
export default snapshotTrigger<{ noteId: string }>({
  key: "new-note-relationship",
  title: "New Note Relationship",
  description: "The run gets each customer or entity link newly added to one note.",
  params: [
    {
      key: "noteId",
      label: "Note ID",
      type: "string",
      required: true,
      hint: "UUID of the note to watch.",
    },
  ],
  load: listPages<{ noteId: string }>(
    noteRelationshipList as unknown as ActionDefinition,
    (p) => ({ noteId: p.noteId }),
  ),
  rowKey: (r) => `${r.type ?? ""}:${(r.target as { id?: unknown } | undefined)?.id ?? ""}`,
  output: [
    { key: "type", type: "string", label: "Relationship type" },
    { key: "target", type: "object", label: "Target (id, type)" },
  ],
  sample: {
    type: "customer",
    target: { id: "56caede9-bae0-4521-9702-d2c553488caf", type: "user" },
  },
});
