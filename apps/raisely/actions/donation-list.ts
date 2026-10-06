import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, privateParam } from "../lib/params.ts";

interface Input extends ListInput {
  campaign?: string;
  profile?: string;
  user?: string;
  subscription?: string;
  organisation?: string;
  designation?: string;
  type?: string;
  mode?: string;
  status?: string;
  currency?: string;
  isSuspicious?: boolean;
}

const donationList: ActionDefinition<Input> = {
  key: "donation-list",
  type: "read",
  resource: "donation",
  title: "List Donations",
  description:
    "List donations, optionally filtered by campaign, profile, user, subscription, status, mode or type.",
  params: [
    { key: "campaign", label: "Campaign", type: "string", hint: "Campaign path or uuid." },
    { key: "profile", label: "Profile", type: "string", hint: "Profile path or uuid." },
    { key: "user", label: "User", type: "string", hint: "User uuid." },
    { key: "subscription", label: "Subscription", type: "string", hint: "Subscription uuid." },
    { key: "organisation", label: "Organisation", type: "string", hint: "Organisation uuid." },
    { key: "designation", label: "Designation", type: "string", hint: "Designation uuid." },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "ONLINE", label: "Online" }, { value: "OFFLINE", label: "Offline" }],
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [{ value: "LIVE", label: "Live" }, { value: "TEST", label: "Test" }],
    },
    { key: "status", label: "Status", type: "string", hint: "Filter by donation status value." },
    { key: "currency", label: "Currency", type: "string", hint: "3 letter currency code." },
    { key: "isSuspicious", label: "Suspicious only", type: "boolean" },
    privateParam(),
    ...listParams(),
  ],
  output: [
    { key: "data", type: "array", label: "List Donations" },
    {
      key: "pagination",
      type: "object",
      label: "Pagination (total, pages, offset, limit, nextUrl)",
    },
  ],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).list("/donations", {
      query: {
        ...listQuery(input),
        ...compact({
          campaign: input.campaign,
          profile: input.profile,
          user: input.user,
          subscription: input.subscription,
          organisation: input.organisation,
          designation: input.designation,
          type: input.type,
          mode: input.mode,
          status: input.status,
          currency: input.currency,
          isSuspicious: input.isSuspicious,
        }),
      },
    });
  },
};

export default donationList;
