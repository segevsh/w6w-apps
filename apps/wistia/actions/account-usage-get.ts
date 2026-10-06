import type { ActionDefinition } from "@w6w/types";
import { WistiaClient } from "../lib/client.ts";

const accountUsageGet: ActionDefinition<Record<string, never>> = {
  key: "account-usage-get",
  type: "read",
  resource: "account",
  title: "Get Account Usage",
  description:
    "Plan, upload eligibility and usage against limits (media, storage, seats). Usage details " +
    "are visible only to account owners and managers; other users get limits: null.",
  params: [],
  output: [
    { key: "plan", type: "object", label: "Plan tier and name" },
    { key: "can_upload", type: "boolean", label: "Can upload" },
    { key: "upload_blocked_reason", type: "string", label: "Why uploads are blocked" },
    { key: "limits", type: "object", label: "Usage and limits (null for non-managers)" },
  ],

  execute(_input, ctx) {
    return new WistiaClient(ctx).json("/account_usage");
  },
};

export default accountUsageGet;
