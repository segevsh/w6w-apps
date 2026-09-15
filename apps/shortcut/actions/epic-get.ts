import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { epicIdParam } from "../lib/params.ts";

interface Input {
  epicId: number;
}

const epicGet: ActionDefinition<Input> = {
  key: "epic-get",
  type: "read",
  resource: "epic",
  title: "Get Epic",
  description: "Fetch one Epic's full definition.",
  params: [epicIdParam],
  output: [{ key: "data", type: "object", label: "The Epic" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(`/epics/${input.epicId}`);
  },
};

export default epicGet;
