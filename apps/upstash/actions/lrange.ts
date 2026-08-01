import type { ActionDefinition } from "@w6w/types";
import { UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
  start: number;
  stop: number;
}

const lrange: ActionDefinition<Input> = {
  key: "lrange",
  type: "read",
  resource: "list",
  title: "Get Range (List)",
  description: "Read a range of elements from a list.",
  params: [
    keyParam(),
    {
      key: "start",
      label: "Start index",
      type: "number",
      default: 0,
      validation: { integer: true },
    },
    {
      key: "stop",
      label: "Stop index",
      type: "number",
      default: -1,
      hint: "-1 means the last element, -2 the second-to-last, and so on.",
      validation: { integer: true },
    },
  ],
  output: resultOutput("array", "List elements in the requested range"),

  execute(input, ctx) {
    return new UpstashClient(ctx).command<string[]>("lrange", input.key, input.start, input.stop);
  },
};

export default lrange;
