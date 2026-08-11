import type { ActionDefinition } from "@w6w/types";
import { encodeId, pick, SplitwiseClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

/**
 * `GET /get_user/{id}` — another user's public profile.
 *
 * Returns the plain `user` schema, not `current_user`: no notification
 * settings, no locale, no default currency. Splitwise gates this on the
 * relationship — 403 when the current user has no visibility of that account,
 * 404 when there is no such user — which is why those two are surfaced with
 * their status intact rather than flattened into one "not found".
 */
interface Input {
  userId: number;
}

const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch another Splitwise user's profile by id.",
  params: [{ ...userIdParam, hint: "From a group's members, a friend list, or an expense share." }],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "registration_status", type: "string", label: "confirmed | dummy | invited" },
  ],

  async execute(input, ctx) {
    const body = await new SplitwiseClient(ctx).request(
      `/get_user/${encodeId(input.userId, "userId")}`,
    );
    return pick<Record<string, unknown>>(body, "user", {});
  },
};

export default getUser;
