import type { ActionDefinition } from "@w6w/types";
import { API_URL, compact, entraError, GraphClient, jsonObject, seg } from "../lib/client.ts";
import { additionalPropertiesParam } from "../lib/params.ts";

interface Input {
  displayName: string;
  mailNickname: string;
  groupType?: string;
  description?: string;
  visibility?: string;
  ownerIds?: string[];
  memberIds?: string[];
  additionalProperties?: unknown;
}

/** Graph accepts at most 20 `owners@odata.bind` + `members@odata.bind` references on create. */
const MAX_RELATIONSHIPS = 20;

const userRefs = (ids?: string[]) =>
  (ids ?? []).map((id) => id.trim()).filter(Boolean).map((id) => `${API_URL}/users/${seg(id)}`);

/**
 * `POST /groups`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-post-groups?view=graph-rest-1.0
 *
 * Answers `201 Created`. Graph requires `displayName`, `mailEnabled`, `mailNickname` and
 * `securityEnabled`; the group type decides the rest:
 *
 *   - **Security** — `groupTypes: []`, `mailEnabled: false`, `securityEnabled: true`
 *   - **Microsoft 365** — `groupTypes: ["Unified"]`, `mailEnabled: true`, `securityEnabled: false`
 *
 * Dynamic membership rules and role-assignable groups are not modelled as fields; the free-form
 * `additionalProperties` merges over the body for callers who need them (and the
 * `RoleManagement.ReadWrite.Directory` permission that `isAssignableToRole` additionally needs).
 *
 * **Owners matter.** Created with an application-only token and no owners, a group is "anonymous"
 * and cannot be modified later; a Microsoft 365 group's SharePoint site may also not be provisioned
 * automatically. In a delegated context the calling user becomes owner of a Microsoft 365 group
 * (and of a security group when not an admin). Owners and members are given as user object ids
 * and sent as `owners@odata.bind` / `members@odata.bind`; at most 20 relationships fit in the
 * create call — add the rest with Add Group Member.
 *
 * `idempotent: false`: there is no client-supplied dedupe key, so a retry can create a second group.
 */
const createGroup: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-group",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a security group or a Microsoft 365 group.",
  idempotent: false,
  params: [
    { key: "displayName", label: "Display name", type: "string", required: true },
    {
      key: "mailNickname",
      label: "Mail nickname",
      type: "string",
      required: true,
      hint:
        'Mail alias, unique for Microsoft 365 groups in the tenant. Max 64 ASCII characters, none of `@ () \\ [] " ; : <> , SPACE`.',
    },
    {
      key: "groupType",
      label: "Group type",
      type: "select",
      default: "security",
      options: [
        { value: "security", label: "Security" },
        { value: "microsoft365", label: "Microsoft 365" },
      ],
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      advanced: true,
      options: [
        { value: "Public", label: "Public" },
        { value: "Private", label: "Private" },
      ],
      hint: "Applies to Microsoft 365 groups.",
    },
    {
      key: "ownerIds",
      label: "Owners (user ids)",
      type: "string",
      repeat: true,
      hint: "User object ids. Strongly recommended — see the README.",
    },
    {
      key: "memberIds",
      label: "Members (user ids)",
      type: "string",
      repeat: true,
      hint: "User object ids.",
    },
    additionalPropertiesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Object id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "mail", type: "string", label: "Mail address" },
    { key: "groupTypes", type: "array", label: "Group types" },
  ],

  async execute(input, ctx) {
    if (!input.displayName?.trim()) throw new Error(entraError("Display name is required."));
    if (!input.mailNickname?.trim()) throw new Error(entraError("Mail nickname is required."));
    const owners = userRefs(input.ownerIds);
    const members = userRefs(input.memberIds);
    if (owners.length + members.length > MAX_RELATIONSHIPS) {
      throw new Error(
        entraError(
          `Graph accepts at most ${MAX_RELATIONSHIPS} owners and members when creating a group; add the rest with Add Group Member.`,
        ),
      );
    }
    const m365 = input.groupType === "microsoft365";
    const client = new GraphClient(ctx);
    ctx.log("info", "creating group", { displayName: input.displayName, m365 });

    return await client.request("/groups", {
      method: "POST",
      body: {
        ...compact({
          displayName: input.displayName,
          description: input.description,
          mailNickname: input.mailNickname,
          visibility: input.visibility,
        }),
        groupTypes: m365 ? ["Unified"] : [],
        mailEnabled: m365,
        securityEnabled: !m365,
        ...(owners.length ? { "owners@odata.bind": owners } : {}),
        ...(members.length ? { "members@odata.bind": members } : {}),
        ...jsonObject(input.additionalProperties, "Additional properties"),
      },
    });
  },
};

export default createGroup;
