import type { ActionDefinition } from "@w6w/types";
import {
  type Input,
  noteIdParam,
  projectIdParam,
  screenIdParam,
  screenPath,
} from "../lib/actions.ts";
import { pathId, ZeplinClient } from "../lib/client.ts";

const deleteScreenNote: ActionDefinition<Input> = {
  key: "delete-screen-note",
  type: "perform",
  resource: "note",
  title: "Delete Screen Note",
  description:
    "Delete a note and its comments from a screen (DELETE /v1/projects/{project_id}/screens/{screen_id}/notes/{note_id}).",
  idempotent: true,
  params: [projectIdParam, screenIdParam, noteIdParam],
  output: [{ key: "deleted", type: "boolean", label: "True when the vendor answered 204" }],

  async execute(input, ctx) {
    const path = `${screenPath(input)}/notes/${pathId(input.noteId, "Note ID")}`;
    await new ZeplinClient(ctx).request("DELETE", path);
    return { deleted: true };
  },
};

export default deleteScreenNote;
