import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { storyIdParam } from "../lib/params.ts";

interface Input {
  storyId: number;
}

const storyGet: ActionDefinition<Input> = {
  key: "story-get",
  type: "read",
  resource: "story",
  title: "Get Story",
  description: "Fetch one Story's full definition.",
  params: [storyIdParam],
  output: [{ key: "data", type: "object", label: "The Story" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(`/stories/${input.storyId}`);
  },
};

export default storyGet;
