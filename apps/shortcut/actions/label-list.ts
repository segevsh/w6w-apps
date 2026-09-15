import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";

interface Input {
  slim?: boolean;
}

const labelList: ActionDefinition<Input> = {
  key: "label-list",
  type: "search",
  resource: "label",
  title: "List Labels",
  description: "List every Label in the connected workspace.",
  params: [
    {
      key: "slim",
      label: "Slim",
      type: "boolean",
      hint: "Return a smaller representation of each Label (omits usage stats).",
    },
  ],
  output: [{ key: "data", type: "array", label: "Labels" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get("/labels", compact({ slim: input.slim }));
  },
};

export default labelList;
