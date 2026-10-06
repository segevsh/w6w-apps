import type { ActionDefinition } from "@w6w/types";
import { LiveChatClient, optStringList, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-agent",
  type: "read",
  resource: "agent",
  title: "Get agent",
  description:
    "One agent by id (`POST /v3.6/configuration/action/get_agent`). Needs `agents--my:ro` or " +
    "`agents--all:ro`.",
  params: [
    {
      key: "agentId",
      label: "Agent ID",
      type: "string",
      required: true,
      hint: "The agent's email.",
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
  output: [{ key: "agent", type: "object", label: "The agent record" }],

  async execute(input, ctx) {
    const fields = optStringList(input.fields, "fields");
    const agent = await new LiveChatClient(ctx).config("get_agent", {
      id: requireString(input.agentId, "agentId"),
      ...(fields ? { fields } : {}),
    });
    return { agent };
  },
};

export default action;
