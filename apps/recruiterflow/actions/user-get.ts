import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, type QueryValue, toInt } from "../lib/client.ts";

interface Input {
  id?: unknown;
  email?: unknown;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  title: "Get User",
  description: "Fetch one user by id or email.",
  params: [
    { key: "id", label: "User ID", type: "number" },
    { key: "email", label: "User email", type: "string" },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const query = compact({ "id": toInt(input.id, "User ID"), "email": input.email }) as Record<
      string,
      QueryValue
    >;
    const res = await call(ctx, "/user/get", { query });
    return asObject(res);
  },
};

export default userGet;
