import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, type QueryValue, toInt } from "../lib/client.ts";

interface Input {
  id?: unknown;
}

const candidateGet: ActionDefinition<Input> = {
  key: "candidate-get",
  type: "read",
  title: "Get Candidate",
  description: "Fetch one candidate by id.",
  params: [
    { key: "id", label: "Candidate ID", type: "number", required: true },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const query = compact({ "id": toInt(input.id, "Candidate ID") }) as Record<string, QueryValue>;
    const res = await call(ctx, "/candidate/get", { query });
    return asObject(res);
  },
};

export default candidateGet;
