import type { ActionDefinition } from "@w6w/types";
import { asList, LIST_OUTPUT, LiveChatClient, optIntList, optStringList } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "list-agents",
  type: "search",
  resource: "agent",
  title: "List agents",
  description:
    "Every agent in the license (`POST /v3.6/configuration/action/list_agents`). Needs " +
    "`agents--all:ro`. The call is not paginated.",
  params: [
    {
      key: "groupIds",
      label: "Group IDs",
      type: "string",
      hint: "Comma-separated integers; only agents in these groups.",
    },
    {
      key: "suspended",
      label: "Suspended",
      type: "boolean",
      hint: "True lists only suspended agents, false only active ones. Leave unset for both.",
    },
    {
      key: "fields",
      label: "Additional fields",
      type: "multiselect",
      options: [
        { value: "groups", label: "Groups" },
        { value: "work_scheduler", label: "Work scheduler" },
        { value: "email_subscriptions", label: "Email subscriptions" },
        { value: "notifications", label: "Notifications" },
        { value: "job_title", label: "Job title" },
        { value: "mobile", label: "Mobile" },
        { value: "max_chats_count", label: "Max concurrent chats" },
        { value: "suspended", label: "Suspended" },
        { value: "awaiting_approval", label: "Awaiting approval" },
        { value: "last_logout", label: "Last logout" },
      ],
    },
  ],
  output: LIST_OUTPUT,

  async execute(input, ctx) {
    const groupIds = optIntList(input.groupIds, "groupIds");
    const filters: Record<string, unknown> = {};
    if (groupIds) filters.group_ids = groupIds;
    if (typeof input.suspended === "boolean") filters.suspended = input.suspended;
    const fields = optStringList(input.fields, "fields");
    return asList(
      await new LiveChatClient(ctx).config("list_agents", {
        ...(Object.keys(filters).length ? { filters } : {}),
        ...(fields ? { fields } : {}),
      }),
    );
  },
};

export default action;
