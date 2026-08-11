import type { ActionDefinition } from "@w6w/types";
import { encodeId, pick, SplitwiseClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

/**
 * `GET /get_group/{id}` — one group, with members and balances.
 *
 * The response carries `invite_link`, a URL of the form
 * `https://www.splitwise.com/join/abQwErTyuI+12` that lets **anyone holding it**
 * join the group directly. It is not a credential in the auth sense and it is
 * returned verbatim — Splitwise's own apps display it, and a workflow that
 * invites people is the obvious reason to read a group — but it is a capability
 * URL, so treat a run record containing one accordingly.
 */
interface Input {
  groupId: number;
}

const getGroup: ActionDefinition<Input> = {
  key: "get-group",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Fetch one group with its members, balances and debts.",
  params: [groupIdParam],
  output: [
    { key: "id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "group_type", type: "string", label: "Type" },
    { key: "members", type: "array", label: "Members, each with per-currency balances" },
    { key: "original_debts", type: "array", label: "Debts as recorded" },
    { key: "simplified_debts", type: "array", label: "Debts after simplification" },
    { key: "invite_link", type: "string", label: "Join link — anyone holding it can join" },
  ],

  async execute(input, ctx) {
    const body = await new SplitwiseClient(ctx).request(
      `/get_group/${encodeId(input.groupId, "groupId")}`,
    );
    return pick<Record<string, unknown>>(body, "group", {});
  },
};

export default getGroup;
