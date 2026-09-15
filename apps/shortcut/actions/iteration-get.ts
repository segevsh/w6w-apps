import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { iterationIdParam } from "../lib/params.ts";

interface Input {
  iterationId: number;
}

const iterationGet: ActionDefinition<Input> = {
  key: "iteration-get",
  type: "read",
  resource: "iteration",
  title: "Get Iteration",
  description: "Fetch one Iteration's full definition.",
  params: [iterationIdParam],
  output: [{ key: "data", type: "object", label: "The Iteration" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(`/iterations/${input.iterationId}`);
  },
};

export default iterationGet;
