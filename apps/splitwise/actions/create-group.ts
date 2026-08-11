import type { ActionDefinition } from "@w6w/types";
import { pick, SplitwiseClient } from "../lib/client.ts";
import { groupTypeOptions } from "../lib/params.ts";
import { flattenMembers, type MemberInput, membersParam } from "../lib/shares.ts";

/**
 * `POST /create_group` — create a group, optionally with members.
 *
 * ## Members use the same flattened encoding as expense shares
 *
 * > **Note**: group user parameters must be flattened into the format
 * > `users__{index}__{property}`, where `property` is `user_id`, `first_name`,
 * > `last_name`, or `email`. The user's email or ID must be provided.
 *
 * `lib/shares.ts#flattenMembers` builds it, so the double-underscore convention
 * lives in one module for both this and Create Expense. Note that Splitwise's
 * own worked example for this endpoint sends `users__1__id` while the prose
 * above says the property is `user_id`; the prose is followed, because `id`
 * appears nowhere else in the API and the example is the one of the two that no
 * schema backs.
 *
 * ## Not idempotent, and Splitwise offers no key
 *
 * There is no idempotency key on any endpoint in this API. A retry creates a
 * second group with the same name — Splitwise does not deduplicate by name —
 * so the runtime must never retry this on its own.
 *
 * `simplify_by_default` is worth setting deliberately: with it on, the group's
 * `simplified_debts` diverge from `original_debts`, and a workflow reading the
 * wrong one reports the wrong person as owing.
 */
interface Input {
  name: string;
  group_type?: string;
  simplify_by_default?: boolean;
  members?: MemberInput[];
}

const createGroup: ActionDefinition<Input> = {
  key: "create-group",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a Splitwise group. The current user is added automatically.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "Housemates 2026",
    },
    {
      key: "group_type",
      label: "Group type",
      type: "select",
      options: groupTypeOptions,
      hint: "What the group is for. Splitwise recommends `home` over `house` or `apartment`.",
    },
    {
      key: "simplify_by_default",
      label: "Simplify debts",
      type: "boolean",
      hint: "Nets debts across the group so fewer payments settle it. When on, read " +
        "`simplified_debts` rather than `original_debts`.",
    },
    membersParam,
  ],
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "members", type: "array", label: "Members" },
    { key: "invite_link", type: "string", label: "Join link" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { name: input.name };
    if (input.group_type) body.group_type = input.group_type;
    if (input.simplify_by_default !== undefined) {
      body.simplify_by_default = input.simplify_by_default;
    }
    Object.assign(body, flattenMembers(input.members, "Members"));

    ctx.log("info", "creating Splitwise group", { name: input.name });
    const res = await new SplitwiseClient(ctx).request("/create_group", { method: "POST", body });
    return pick<Record<string, unknown>>(res, "group", {});
  },
};

export default createGroup;
