import type { ActionDefinition } from "@w6w/types";
import { WorkDriveClient } from "../lib/client.ts";

interface Output {
  item: unknown;
}

/** `GET /users/me` — the authenticated user (id/zuid, email, edition, storage). */
const userGet: ActionDefinition<Record<string, never>, Output> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Fetch the authenticated user: id (ZUID), email, WorkDrive edition and storage usage.",
  params: [],
  output: [{ key: "item", type: "object", label: "User resource (JSON:API `data`)" }],

  async execute(_input, ctx) {
    const body = await new WorkDriveClient(ctx).get("/users/me");
    return { item: body.data ?? null };
  },
};

export default userGet;
