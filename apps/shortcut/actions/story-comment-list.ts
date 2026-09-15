import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { storyIdParam } from "../lib/params.ts";

interface Input {
  storyId: number;
}

const storyCommentList: ActionDefinition<Input> = {
  key: "story-comment-list",
  type: "search",
  resource: "story",
  title: "List Story Comments",
  description: "List every comment on a Story.",
  params: [storyIdParam],
  output: [{ key: "data", type: "array", label: "Comments" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(`/stories/${input.storyId}/comments`);
  },
};

export default storyCommentList;
