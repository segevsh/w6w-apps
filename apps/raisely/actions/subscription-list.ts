import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, privateParam } from "../lib/params.ts";

interface Input extends ListInput {
  campaign?: string;
  profile?: string;
  user?: string;
  organisation?: string;
  designation?: string;
  mode?: string;
  status?: string;
  source?: string;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "read",
  resource: "subscription",
  title: "List Subscriptions",
  description:
    "List recurring donation subscriptions, optionally filtered by campaign, profile, user, status, mode or source.",
  params: [
    { key: "campaign", label: "Campaign", type: "string", hint: "Campaign path or uuid." },
    { key: "profile", label: "Profile", type: "string", hint: "Profile path or uuid." },
    { key: "user", label: "User", type: "string", hint: "User uuid." },
    { key: "organisation", label: "Organisation", type: "string", hint: "Organisation uuid." },
    { key: "designation", label: "Designation", type: "string", hint: "Designation uuid." },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [{ value: "LIVE", label: "Live" }, { value: "TEST", label: "Test" }],
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Filter by subscription status value.",
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: [{ value: "ONLINE", label: "Online" }, { value: "OFFLINE", label: "Offline" }],
    },
    privateParam(),
    ...listParams(),
  ],
  output: [
    { key: "data", type: "array", label: "List Subscriptions" },
    {
      key: "pagination",
      type: "object",
      label: "Pagination (total, pages, offset, limit, nextUrl)",
    },
  ],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).list("/subscriptions", {
      query: {
        ...listQuery(input),
        ...compact({
          campaign: input.campaign,
          profile: input.profile,
          user: input.user,
          organisation: input.organisation,
          designation: input.designation,
          mode: input.mode,
          status: input.status,
          source: input.source,
        }),
      },
    });
  },
};

export default subscriptionList;
