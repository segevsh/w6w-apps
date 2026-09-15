import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { iterationIdParam } from "../lib/params.ts";

interface Input {
  iterationId: number;
}

const iterationDelete: ActionDefinition<Input> = {
  key: "iteration-delete",
  type: "perform",
  resource: "iteration",
  title: "Delete Iteration",
  description: "Permanently delete an Iteration. This does not delete the Stories inside it.",
  idempotent: true,
  params: [iterationIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new ShortcutClient(ctx).delete(`/iterations/${input.iterationId}`);
    return { status };
  },
};

export default iterationDelete;
