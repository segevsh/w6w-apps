import type { ActionDefinition } from "@w6w/types";
import { recordsOf, RecruitClient } from "../lib/client.ts";

const userList: ActionDefinition<Record<string, never>> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "The account's users (`GET /v1/users`) — the ids that go in the `Owner user id` fields.",
  params: [],
  output: [{ key: "items", type: "array", label: "Users ({id, first_name, last_name, email})" }],

  async execute(_input, ctx) {
    const raw = await new RecruitClient(ctx).json<unknown>("/users");
    return { items: recordsOf(raw) };
  },
};

export default userList;
