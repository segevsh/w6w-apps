import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";
import { shapeMember } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "member-get",
  type: "read",
  resource: "member",
  title: "Get a member",
  description:
    "Retrieve one member. `id` is organization-scoped; `userId` is the person's account-wide id.",
  params: [
    {
      key: "memberId",
      label: "Member ID",
      type: "string",
      required: true,
      default: "",
      hint: "The organization-scoped `id` from `member-list`.",
    },
  ],
  output: [
    { key: "member", type: "object", label: "The member as Bitwarden returned it" },
    { key: "id", type: "string", label: "Organization-scoped member id" },
    { key: "userId", type: "string", label: "Account-wide user id (NOT the same as id)" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Profile name, if set" },
    { key: "type", type: "number", label: "0 Owner, 1 Admin, 2 User, 4 Custom" },
    { key: "typeName", type: "string", label: "Role name" },
    {
      key: "status",
      type: "number",
      label: "-1 Revoked, 0 Invited, 1 Accepted, 2 Confirmed, 3 Staged",
    },
    { key: "statusName", type: "string", label: "Lifecycle stage" },
    { key: "twoFactorEnabled", type: "boolean", label: "Whether two-step login is on" },
    { key: "externalId", type: "string", label: "External id" },
    { key: "collections", type: "array", label: "Collections with permissions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.memberId, "memberId");
    return shapeMember(await new BitwardenClient(ctx).request(`/members/${id}`));
  },
};

export default action;
