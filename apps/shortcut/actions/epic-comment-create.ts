import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { epicIdParam } from "../lib/params.ts";

interface Input {
  epicId: number;
  text: string;
  authorId?: string;
}

const epicCommentCreate: ActionDefinition<Input> = {
  key: "epic-comment-create",
  type: "perform",
  resource: "epic",
  title: "Comment on Epic",
  description: "Add a comment to an Epic.",
  idempotent: false,
  params: [
    epicIdParam,
    { key: "text", label: "Comment text", type: "text", required: true },
    { key: "authorId", label: "Author (Member UUID)", type: "string" },
  ],
  output: [{ key: "data", type: "object", label: "The created comment" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).post(
      `/epics/${input.epicId}/comments`,
      compact({ text: input.text, author_id: input.authorId }),
    );
  },
};

export default epicCommentCreate;
