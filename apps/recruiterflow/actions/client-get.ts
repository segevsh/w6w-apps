import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, type QueryValue, toInt } from "../lib/client.ts";

interface Input {
  id?: unknown;
}

const clientGet: ActionDefinition<Input> = {
  key: "client-get",
  type: "read",
  title: "Get Client",
  description: "Fetch one client company by id.",
  params: [
    { key: "id", label: "Client ID", type: "number", required: true },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const query = compact({ "id": toInt(input.id, "Client ID") }) as Record<string, QueryValue>;
    const res = await call(ctx, "/client/get", { query });
    return asObject(res);
  },
};

export default clientGet;
