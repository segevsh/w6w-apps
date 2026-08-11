import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

/**
 * `POST /add_user_to_group` — add someone to a group.
 *
 * ## Two identity forms, and this one is NOT flattened
 *
 * Unlike Create Group and Create Expense, this endpoint takes a single user at
 * top level — `{group_id, user_id}` or
 * `{group_id, first_name, last_name, email}` — with no `users__{index}__`
 * prefix anywhere. The reference models it as a `oneOf` with those two exact
 * required sets, and this action enforces them: a `user_id`, or **all three** of
 * first name, last name and email. An email on its own is not a documented
 * third form.
 *
 * ## Why this is not marked idempotent
 *
 * Adding a `user_id` that is already a member converges, but the email form
 * does not: an address belonging to nobody makes Splitwise mint an *invited*
 * placeholder user, and a retry after a dropped connection can mint a second
 * one. Since one action covers both forms, the honest flag for the pair is
 * `false` — the runtime must not retry it unattended.
 *
 * > **Note**: 200 OK does not indicate a successful response. You must check
 * > the `success` value of the response.
 *
 * The failure body here keys `errors` by the offending field rather than by
 * `base`, which `lib/client.ts#collectErrors` preserves — "email: is invalid"
 * is a different fix from a generic rejection.
 */
interface Input {
  groupId: number;
  userId?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
}

const addUserToGroup: ActionDefinition<Input> = {
  key: "add-user-to-group",
  type: "perform",
  resource: "group",
  title: "Add User To Group",
  description:
    "Add a user to a group, by user id or by email plus both names. An email nobody owns creates " +
    "an invited placeholder user.",
  idempotent: false,
  params: [
    groupIdParam,
    {
      key: "userId",
      label: "User ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Existing Splitwise user. Supply this, or all three of the name/email fields below.",
    },
    { key: "first_name", label: "First name", type: "string", row: "name" },
    { key: "last_name", label: "Last name", type: "string", row: "name" },
    { key: "email", label: "Email", type: "string" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Added" },
    { key: "user", type: "object", label: "The user that was added" },
  ],

  async execute(input, ctx) {
    const groupId = Number(input.groupId);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      throw new Error(`groupId must be a positive integer id, got "${String(input.groupId)}"`);
    }
    const body: Record<string, unknown> = { group_id: groupId };

    const rawUserId = input.userId;
    const hasUserId = rawUserId !== undefined && rawUserId !== null &&
      String(rawUserId).trim() !== "";
    if (hasUserId) {
      const userId = Number(String(rawUserId).trim());
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new Error(`userId must be a positive integer, got "${String(rawUserId)}"`);
      }
      body.user_id = userId;
    } else {
      const first = (input.first_name ?? "").trim();
      const last = (input.last_name ?? "").trim();
      const email = (input.email ?? "").trim();
      if (!first || !last || !email) {
        throw new Error(
          "Supply a userId, or all three of first_name, last_name and email — those are the only " +
            "two forms Splitwise documents for this endpoint.",
        );
      }
      body.first_name = first;
      body.last_name = last;
      body.email = email;
    }

    const res = await new SplitwiseClient(ctx).request("/add_user_to_group", {
      method: "POST",
      body,
    });
    return { success: true, user: pick<Record<string, unknown>>(res, "user", {}) };
  },
};

export default addUserToGroup;
