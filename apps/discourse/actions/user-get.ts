import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";
import { userOutput } from "../lib/params.ts";

/**
 * `GET /u/{username}.json` — a user by username, not by id.
 *
 * Discourse's public user routes are keyed on username throughout (`/u/{name}`,
 * `/user-badges/{name}`), while the admin routes are keyed on numeric id
 * (`/admin/users/{id}.json`). That split is the reason `user-suspend` in this
 * app takes an id and this action takes a name: they are different route
 * families, not an inconsistency introduced here.
 *
 * The response envelopes under `user`, which is unwrapped so downstream steps
 * see the record directly.
 */
interface Input {
  username: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a user's public profile by username.",
  params: [
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      hint: "Discourse's public user routes are keyed on username, not on the numeric id.",
    },
  ],
  output: userOutput,

  async execute(input, ctx) {
    const body = await new DiscourseClient(ctx).request<{ user?: unknown }>(
      `/u/${encodeURIComponent(input.username)}.json`,
    );
    return body?.user ?? body;
  },
};

export default userGet;
