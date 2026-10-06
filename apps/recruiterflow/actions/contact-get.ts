import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, type QueryValue, toInt } from "../lib/client.ts";

interface Input {
  id?: unknown;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  title: "Get Contact",
  description: "Fetch one contact by id.",
  params: [
    { key: "id", label: "Contact ID", type: "number", required: true },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const query = compact({ "id": toInt(input.id, "Contact ID") }) as Record<string, QueryValue>;
    const res = await call(ctx, "/contact/get", { query });
    return asObject(res);
  },
};

export default contactGet;
