import type { ActionDefinition } from "@w6w/types";
import {
  type Input,
  noteIdParam,
  projectIdParam,
  screenIdParam,
  screenPath,
} from "../lib/actions.ts";
import { pathId, requireText, ZeplinClient } from "../lib/client.ts";

const createScreenComment: ActionDefinition<Input> = {
  key: "create-screen-comment",
  type: "perform",
  resource: "comment",
  title: "Create Screen Comment",
  description:
    "Reply to a screen note (POST /v1/projects/{project_id}/screens/{screen_id}/notes/{note_id}/comments).",
  idempotent: false,
  params: [
    projectIdParam,
    screenIdParam,
    noteIdParam,
    { key: "content", label: "Comment", type: "text", required: true },
  ],
  output: [{ key: "id", type: "string", label: "Comment ID" }],

  async execute(input, ctx) {
    const path = `${screenPath(input)}/notes/${pathId(input.noteId, "Note ID")}/comments`;
    return await new ZeplinClient(ctx).request("POST", path, {
      body: { content: requireText(input.content, "Comment") },
    });
  },
};

export default createScreenComment;
