import type { ActionDefinition } from "@w6w/types";
import { compact, entraError, GraphClient, jsonObject, seg } from "../lib/client.ts";
import { additionalPropertiesParam, groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  displayName?: string;
  description?: string;
  mailNickname?: string;
  visibility?: string;
  securityEnabled?: boolean;
  additionalProperties?: unknown;
}

/**
 * `PATCH /groups/{id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-update?view=graph-rest-1.0
 *
 * Sends only what the caller set. Answers `204 No Content` — or `200 OK` with the group for a
 * handful of Microsoft 365-only properties (`allowExternalSenders`, `autoSubscribeNewMembers`, …
 * which are settable here through `additionalProperties`) — so the action returns
 * `{ updated: true, groupId }` plus any body Graph did send. Membership is not changed here; use
 * Add / Remove Group Member. `displayName` cannot be cleared.
 */
const updateGroup: ActionDefinition<Input, Record<string, unknown>> = {
  key: "update-group",
  type: "perform",
  resource: "group",
  title: "Update Group",
  description: "Update a group's name, description, nickname or visibility.",
  idempotent: true,
  params: [
    groupIdParam,
    { key: "displayName", label: "Display name", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "mailNickname", label: "Mail nickname", type: "string", advanced: true },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      advanced: true,
      options: [
        { value: "Public", label: "Public" },
        { value: "Private", label: "Private" },
      ],
      hint: "Microsoft 365 groups only.",
    },
    {
      key: "securityEnabled",
      label: "Security enabled",
      type: "boolean",
      advanced: true,
      hint: "Leave unset to keep the current value.",
    },
    additionalPropertiesParam,
  ],
  output: [
    { key: "updated", type: "boolean", label: "Updated" },
    { key: "groupId", type: "string", label: "Group id" },
  ],

  async execute(input, ctx) {
    const body = {
      ...compact({
        displayName: input.displayName,
        description: input.description,
        mailNickname: input.mailNickname,
        visibility: input.visibility,
        securityEnabled: input.securityEnabled,
      }),
      ...jsonObject(input.additionalProperties, "Additional properties"),
    };
    if (Object.keys(body).length === 0) {
      throw new Error(entraError("Set at least one property to update."));
    }
    const client = new GraphClient(ctx);
    ctx.log("info", "updating group", { groupId: input.groupId, fields: Object.keys(body) });
    const res = await client.request<Record<string, unknown> | undefined>(
      `/groups/${seg(input.groupId)}`,
      { method: "PATCH", body },
    );
    return { ...(res ?? {}), updated: true, groupId: input.groupId };
  },
};

export default updateGroup;
