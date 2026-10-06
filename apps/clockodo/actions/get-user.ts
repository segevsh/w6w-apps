import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
}

const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Read one user by id (GET /v3/users/{id}).",
  params: [
    {
      key: "id",
      label: "User ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "User" },
  ],

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v3/users/${id}`);
    return { data: body.data ?? null };
  },
};

export default getUser;
