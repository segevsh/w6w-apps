import type { ActionDefinition } from "@w6w/types";
import {
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
  key: "member-create",
  type: "perform",
  resource: "member",
  title: "Invite a member",
  description:
    "Invite someone to the organization by email, as Owner (0), Admin (1), User (2) or Custom (4 \u2014 then set `permissions`). There is no type 3. The member starts as Invited and must accept and be confirmed before they have access.",
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      default: "",
      validation: { maxLength: 256 },
    },
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
      hint:
        'Only for role Custom: an object of booleans such as `{ "manageUsers": true, "accessEventLogs": true }`. Keys: accessEventLogs, accessImportExport, accessReports, createNewCollections, editAnyCollection, deleteAnyCollection, manageGroups, managePolicies, manageSso, manageUsers, manageResetPassword, manageScim, manageAccessRules.',
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
      hint: "Group ids to add the member to, one per line or comma separated.",
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
    const email = String(p.email ?? "").trim();
    if (!email || !email.includes("@")) throw new Error("`email` must be an email address");
    const type = intEnum(p.type ?? 2, "type", ORG_TYPE_NAMES);
    const body = compact({
      email,
      type,
      externalId: p.externalId === undefined ? undefined : String(p.externalId),
      permissions: json(p.permissions, "permissions"),
      collections: associations(p.collections, "collections"),
      groups: p.groups === undefined ? undefined : uuidList(p.groups, "groups"),
    });
    return shapeMember(
      await new BitwardenClient(ctx).request("/members", { method: "POST", body }),
    );
  },
};

export default action;
