import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { noteIdParam, noteOutput, seg } from "../lib/params.ts";

/**
 * `PUT /v1/notes/{noteId}/owner` (operationId `updateNoteOwner`).
 *
 * The owner is a user OR a group ("Either userId or groupId will be set, but not both"), so
 * exactly one of the two is required here.
 */
interface Input {
  noteId: string;
  userId?: string;
  groupId?: string;
}

const noteOwnerUpdate: ActionDefinition<Input> = {
  key: "note-owner-update",
  type: "perform",
  resource: "note",
  title: "Update Note Owner",
  description: "Set a note's owner to a user or to a group.",
  idempotent: true,
  params: [
    noteIdParam,
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "Make this user the owner. Give this OR a group id. Find ids with Search Users.",
    },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "Make this group the owner. Find ids with Search Groups.",
    },
  ],
  output: noteOutput,

  execute(input, ctx) {
    const userId = (input.userId ?? "").trim();
    const groupId = (input.groupId ?? "").trim();
    if (!userId === !groupId) throw new Error("Give exactly one of userId or groupId");
    return new SliteClient(ctx).request(`/notes/${seg(input.noteId, "noteId")}/owner`, {
      method: "PUT",
      body: userId ? { userId } : { groupId },
    });
  },
};

export default noteOwnerUpdate;
