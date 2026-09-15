import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { storyIdParam } from "../lib/params.ts";

interface Input {
  storyId: number;
  text: string;
  authorId?: string;
  parentId?: number;
}

const storyCommentCreate: ActionDefinition<Input> = {
  key: "story-comment-create",
  type: "perform",
  resource: "story",
  title: "Comment on Story",
  description: "Add a comment to a Story, optionally as a reply to another comment.",
  idempotent: false,
  params: [
    storyIdParam,
    { key: "text", label: "Comment text", type: "text", required: true },
    { key: "authorId", label: "Author (Member UUID)", type: "string" },
    {
      key: "parentId",
      label: "Parent comment ID",
      type: "number",
      validation: { integer: true },
      hint: "Set to reply to another comment on this Story.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created comment" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).post(
      `/stories/${input.storyId}/comments`,
      compact({ text: input.text, author_id: input.authorId, parent_id: input.parentId }),
    );
  },
};

export default storyCommentCreate;
