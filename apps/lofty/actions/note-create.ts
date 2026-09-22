import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `POST /v1.0/notes` — log a note on a lead.
 *
 * Answers `{ "noteId": <id> }` — the id that Get, Update and Delete Note take
 * (not the timeline `id` a List Notes row also carries).
 *
 * ## Content is silently truncated
 *
 * The spec says note content is "silently truncated to 2000 characters". Not
 * rejected — accepted and cut, so a long note loses its tail with no error.
 * The hint says so, because the alternative is a workflow storing a report
 * that arrives half-missing.
 *
 * `isPin` is required by the schema; a note that should sit at the top of the
 * lead's timeline sets it true.
 */
interface Input {
  content: string;
  leadId: number;
  isPin: boolean;
}

const action: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Add Note",
  description: "Log a free-text note on a lead (POST /v1.0/notes).",
  idempotent: false,
  params: [
    {
      key: "content",
      label: "Note",
      type: "text",
      required: true,
      hint: "Truncated to 2000 characters by Lofty, silently — longer content loses its tail.",
    },
    leadIdParam,
    {
      key: "isPin",
      label: "Pin to top",
      type: "boolean",
      required: true,
      default: false,
      hint: "Pin the note to the top of the lead's timeline.",
    },
  ],
  output: [{ key: "noteId", type: "number", label: "Created note ID" }],

  execute(input, ctx) {
    return new LoftyClient(ctx).request<{ noteId?: number }>("/notes", {
      method: "POST",
      body: { content: input.content, leadId: input.leadId, isPin: input.isPin },
    });
  },
};

export default action;
