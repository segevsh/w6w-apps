import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { storyIdParam } from "../lib/params.ts";

interface Input {
  storyId: number;
}

const storyDelete: ActionDefinition<Input> = {
  key: "story-delete",
  type: "perform",
  resource: "story",
  title: "Delete Story",
  description: "Permanently delete a Story.",
  idempotent: true,
  params: [storyIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new ShortcutClient(ctx).delete(`/stories/${input.storyId}`);
    return { status };
  },
};

export default storyDelete;
