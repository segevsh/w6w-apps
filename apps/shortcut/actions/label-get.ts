import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { labelIdParam } from "../lib/params.ts";

interface Input {
  labelId: number;
}

const labelGet: ActionDefinition<Input> = {
  key: "label-get",
  type: "read",
  resource: "label",
  title: "Get Label",
  description: "Fetch one Label's full definition.",
  params: [labelIdParam],
  output: [{ key: "data", type: "object", label: "The Label" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(`/labels/${input.labelId}`);
  },
};

export default labelGet;
