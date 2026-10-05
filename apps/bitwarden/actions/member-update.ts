import type { ActionDefinition } from "@w6w/types";
import {
  assertUuid,
  associations,
  BitwardenClient,
  compact,
  intEnum,
  json,
  ORG_TYPE_NAMES,
  uuidList,
} from "../lib/client.ts";
import { shapeMember } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "member-update",
  type: "perform",
  resource: "member",
  title: "Update a member",
  description:
    "Change a member's role, `externalId`, permissions, collection access or group membership. A PUT with `type` required; the spec does not say omitted `collections`/`groups` are preserved, so send the complete sets you want kept.",
  idempotent: true,
  params: [
    { key: "memberId", label: "Member ID", type: "string", required: true, default: "" },
    {
      key: "type",
      label: "Role",
      type: "select",
      required: true,
      default: "2",
      options: [{ value: "0", label: "Owner" }, { value: "1", label: "Admin" }, {
        value: "2",
        label: "User",
      }, { value: "4", label: "Custom" }],
    },
    { key: "externalId", label: "External ID", type: "string", validation: { maxLength: 300 } },
    {
      key: "permissions",
      label: "Custom permissions",
      type: "json",
      hint: "Only for role Custom: an object of booleans (see Invite a member).",
    },
    {
      key: "collections",
      label: "Collections",
      type: "json",
      hint:
        'Collections the member can access. JSON array of `{ "id": "<uuid>", "readOnly": false, "hidePasswords": false, "manage": false }`. `readOnly` is required by Bitwarden and defaults to false here.',
    },
    {
      key: "groups",
      label: "Group IDs",
      type: "text",
      hint: "Group ids, one per line or comma separated.",
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
    const body = compact({
      type: intEnum(p.type, "type", ORG_TYPE_NAMES),
      externalId: p.externalId === undefined ? undefined : String(p.externalId),
      permissions: json(p.permissions, "permissions"),
      collections: associations(p.collections, "collections"),
      groups: p.groups === undefined ? undefined : uuidList(p.groups, "groups"),
    });
    if (body.type === undefined) throw new Error("`type` (the role) is required by Bitwarden");
    return shapeMember(
      await new BitwardenClient(ctx).request(`/members/${id}`, { method: "PUT", body }),
    );
  },
};

export default action;
