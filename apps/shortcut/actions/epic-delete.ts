import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { epicIdParam } from "../lib/params.ts";

interface Input {
  epicId: number;
}

const epicDelete: ActionDefinition<Input> = {
  key: "epic-delete",
  type: "perform",
  resource: "epic",
  title: "Delete Epic",
  description: "Permanently delete an Epic. This does not delete the Stories inside it.",
  idempotent: true,
  params: [epicIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new ShortcutClient(ctx).delete(`/epics/${input.epicId}`);
    return { status };
  },
};

export default epicDelete;
