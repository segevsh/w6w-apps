import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { epicIdParam } from "../lib/params.ts";

interface Input {
  epicId: number;
}

const epicCommentList: ActionDefinition<Input> = {
  key: "epic-comment-list",
  type: "search",
  resource: "epic",
  title: "List Epic Comments",
  description: "List every comment on an Epic.",
  params: [epicIdParam],
  output: [{ key: "data", type: "array", label: "Comments" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(`/epics/${input.epicId}/comments`);
  },
};

export default epicCommentList;
