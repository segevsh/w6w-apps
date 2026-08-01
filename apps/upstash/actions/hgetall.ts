import type { ActionDefinition } from "@w6w/types";
import { pairsToObject, UpstashClient } from "../lib/client.ts";
import { keyParam, resultOutput } from "../lib/params.ts";

interface Input {
  key: string;
}

const hgetall: ActionDefinition<Input> = {
  key: "hgetall",
  type: "read",
  resource: "hash",
  title: "Get All Fields (Hash)",
  description: "Get every field and value in a hash.",
  params: [keyParam()],
  output: resultOutput("object", "Field -> value map ({} if the key does not exist)"),

  // Upstash's REST HGETALL returns the RESP2 flat-array shape
  // ([field1, value1, field2, value2, ...]); fold it into a plain object so
  // a workflow can address a field by name.
  async execute(input, ctx) {
    const { result } = await new UpstashClient(ctx).command<string[]>("hgetall", input.key);
    return { result: pairsToObject(result) };
  },
};

export default hgetall;
