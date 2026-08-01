import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, SupabaseClient } from "../lib/client.ts";

interface Input {
  function: string;
  params?: unknown;
}

const rpcCall: ActionDefinition<Input> = {
  key: "rpc-call",
  type: "perform",
  resource: "rpc",
  title: "Call Function (RPC)",
  description: "Call a Postgres function exposed via PostgREST's `/rpc/<function>` endpoint.",
  // Whether a call is safe to retry depends entirely on the function itself.
  idempotent: false,
  params: [
    {
      key: "function",
      label: "Function name",
      type: "string",
      required: true,
      hint: "Name of the Postgres function, exactly as declared (must be in an exposed schema).",
    },
    {
      key: "params",
      label: "Arguments",
      type: "json",
      hint:
        'JSON object mapping the function\'s named parameters to values, e.g. { "user_id": 5 }. ' +
        "Leave empty for a function that takes no arguments.",
    },
  ],
  output: [
    { key: "result", type: "object", label: "The function's return value" },
  ],

  async execute(input, ctx) {
    const args = parseJsonParam(input.params);
    const result = await new SupabaseClient(ctx).request(`/rpc/${input.function}`, {
      method: "POST",
      body: args ?? {},
    });
    return { result };
  },
};

export default rpcCall;
