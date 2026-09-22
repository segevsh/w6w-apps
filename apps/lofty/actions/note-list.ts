import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `GET /v1.0/notes?leadId={leadId}` — every note on a lead.
 *
 * ## Two ids per row, and only one of them works elsewhere
 *
 * Each entry carries `id` — the **timeline** record that carries the note — and
 * `noteId` — the note itself. Get, Update and Delete Note all take `noteId`;
 * passing `id` looks plausible and addresses a timeline entry, not the note.
 * The spec calls this out explicitly, so it is repeated here.
 *
 * `includeSystemNote` pulls in Lofty's own automated entries (activity
 * summaries and the like), which are omitted by default so a workflow reading
 * a lead's notes sees what people wrote.
 */
interface Input {
  leadId: number;
  includeSystemNote?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List Notes",
  description: "List the notes attached to a lead (GET /v1.0/notes).",
  params: [
    leadIdParam,
    {
      key: "includeSystemNote",
      label: "Include system notes",
      type: "boolean",
      hint: "Add Lofty's own automated timeline entries alongside user-written notes.",
    },
  ],
  output: [{ key: "notes", type: "array", label: "Notes" }],

  execute(input, ctx) {
    return new LoftyClient(ctx).request("/notes", {
      query: { leadId: input.leadId, includeSystemNote: input.includeSystemNote },
    });
  },
};

export default action;
