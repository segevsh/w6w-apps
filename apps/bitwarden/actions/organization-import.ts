import type { ActionDefinition } from "@w6w/types";
import { BitwardenClient, compact, json } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "organization-import",
  type: "perform",
  resource: "organization",
  title: "Import members and groups",
  description:
    "Bulk-provision members and groups from an external directory. `overwriteExisting` is required: when true the request replaces the organization's existing data rather than appending, so a partial list can remove people \u2014 default is false. Each member needs `externalId`; `email` is required unless `deleted` is true. Set `largeImport` for more than 2000 users/groups.",
  idempotent: false,
  params: [
    {
      key: "members",
      label: "Members",
      type: "json",
      hint: 'JSON array of `{ "externalId": "…", "email": "…", "deleted": false }`.',
    },
    {
      key: "groups",
      label: "Groups",
      type: "json",
      hint: 'JSON array of `{ "name": "…", "externalId": "…", "memberExternalIds": ["…"] }`.',
    },
    {
      key: "overwriteExisting",
      label: "Overwrite existing",
      type: "boolean",
      required: true,
      default: false,
      hint: "True = the import replaces existing organization data; false = append.",
    },
    {
      key: "largeImport",
      label: "Large import",
      type: "boolean",
      default: false,
      hint: "Set when over 2000 users and/or groups are expected.",
    },
    {
      key: "inviteUsersAfterProvisioning",
      label: "Invite after provisioning",
      type: "boolean",
      hint:
        "Send invitation emails to newly provisioned members. When false they are created without an invitation.",
    },
  ],
  output: [
    { key: "statusCode", type: "number", label: "The statusCode Bitwarden reports" },
    { key: "memberCount", type: "number", label: "Members sent" },
    { key: "groupCount", type: "number", label: "Groups sent" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const members = json(p.members, "members") ?? [];
    const groups = json(p.groups, "groups") ?? [];
    if (!Array.isArray(members) || !Array.isArray(groups)) {
      throw new Error("`members` and `groups` must be JSON arrays");
    }
    members.forEach((m, i) => {
      const row = m as Record<string, unknown>;
      if (!row?.externalId) throw new Error(`\`members[${i}].externalId\` is required`);
      if (!row.deleted && !row.email) {
        throw new Error(`\`members[${i}].email\` is required unless the member is deleted`);
      }
    });
    groups.forEach((g, i) => {
      const row = g as Record<string, unknown>;
      if (!row?.name || !row?.externalId) {
        throw new Error(`\`groups[${i}]\` needs both \`name\` and \`externalId\``);
      }
    });
    const body = compact({
      members,
      groups,
      overwriteExisting: Boolean(p.overwriteExisting),
      largeImport: p.largeImport === undefined ? undefined : Boolean(p.largeImport),
      inviteUsersAfterProvisioning: p.inviteUsersAfterProvisioning === undefined
        ? undefined
        : Boolean(p.inviteUsersAfterProvisioning),
    });
    ctx.log("info", "importing into the organization", {
      members: members.length,
      groups: groups.length,
      overwriteExisting: body.overwriteExisting,
    });
    const res = await new BitwardenClient(ctx).request<{ statusCode?: number } | null>(
      "/organization/import",
      { method: "POST", body },
    );
    return {
      statusCode: res?.statusCode ?? 200,
      memberCount: members.length,
      groupCount: groups.length,
    };
  },
};

export default action;
