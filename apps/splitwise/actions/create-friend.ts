import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";

/**
 * `POST /create_friend` — add a friend by email.
 *
 * > Adds a friend. If the other user does not exist, you must supply
 * > `user_first_name`. If the other user exists, `user_first_name` and
 * > `user_last_name` will be ignored.
 *
 * ## A documented inconsistency, and which side this app takes
 *
 * The request schema lists exactly three properties — `user_email`,
 * `user_first_name`, `user_last_name` — and then declares
 * `required: ["email"]`, naming a property that **does not exist in its own
 * schema**. One of the two is wrong and the reference does not say which.
 *
 * This app sends `user_email`, because it is the name that appears in the
 * `properties` block, matches the `user_`-prefixed siblings, and matches the
 * prose above (which spells the other two `user_first_name` /
 * `user_last_name`). The lone `required: ["email"]` is treated as a typo in the
 * required list rather than as evidence of a fourth, undocumented parameter
 * name. If Splitwise ever rejects the call for a missing `email`, that is the
 * line to change — and the reason it is called out here rather than buried.
 *
 * ## Not idempotent
 *
 * An email nobody owns makes Splitwise create an **invited placeholder user**,
 * so a retry after a dropped connection can mint a second one. There is no
 * idempotency key anywhere in this API.
 */
interface Input {
  user_email: string;
  user_first_name?: string;
  user_last_name?: string;
}

const createFriend: ActionDefinition<Input> = {
  key: "create-friend",
  type: "perform",
  resource: "friend",
  title: "Create Friend",
  description:
    "Add a friend by email. If nobody owns that address Splitwise creates an invited placeholder " +
    "user, for which a first name is required.",
  idempotent: false,
  params: [
    {
      key: "user_email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "ada@example.com",
    },
    {
      key: "user_first_name",
      label: "First name",
      type: "string",
      row: "name",
      hint: "Required when nobody owns that email yet; ignored when the user already exists.",
    },
    { key: "user_last_name", label: "Last name", type: "string", row: "name" },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "email", type: "string", label: "Email" },
    { key: "registration_status", type: "string", label: "confirmed | dummy | invited" },
  ],

  async execute(input, ctx) {
    const email = (input.user_email ?? "").trim();
    if (!email) throw new Error("user_email is required");

    const body: Record<string, unknown> = { user_email: email };
    if (input.user_first_name) body.user_first_name = String(input.user_first_name).trim();
    if (input.user_last_name) body.user_last_name = String(input.user_last_name).trim();

    const res = await new SplitwiseClient(ctx).request("/create_friend", { method: "POST", body });
    return pick<Record<string, unknown>>(res, "friend", {});
  },
};

export default createFriend;
