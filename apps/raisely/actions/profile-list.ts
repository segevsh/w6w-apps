import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, privateParam } from "../lib/params.ts";

interface Input extends ListInput {
  campaign: string;
  rank?: string;
  rankDonors?: string;
  rankActivityTotal?: string;
  rankActivityTime?: string;
}

const profileList: ActionDefinition<Input> = {
  key: "profile-list",
  type: "read",
  resource: "profile",
  title: "List Profiles",
  description: "List fundraiser profiles in a campaign (individuals, teams and organisations).",
  params: [
    {
      key: "campaign",
      label: "Campaign",
      type: "string",
      required: true,
      hint: "The uuid, path or domain of the campaign.",
    },
    {
      key: "rank",
      label: "Rank by total raised",
      type: "string",
      hint: "Rank profiles by total raised (value as documented by Raisely).",
    },
    { key: "rankDonors", label: "Rank by unique donors", type: "string" },
    { key: "rankActivityTotal", label: "Rank by activity total", type: "string" },
    { key: "rankActivityTime", label: "Rank by activity time", type: "string" },
    privateParam(),
    ...listParams(),
  ],
  output: [
    { key: "data", type: "array", label: "List Profiles" },
    {
      key: "pagination",
      type: "object",
      label: "Pagination (total, pages, offset, limit, nextUrl)",
    },
  ],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).list("/profiles", {
      query: {
        ...listQuery(input),
        ...compact({
          campaign: input.campaign,
          rank: input.rank,
          rankDonors: input.rankDonors,
          rankActivityTotal: input.rankActivityTotal,
          rankActivityTime: input.rankActivityTime,
        }),
      },
    });
  },
};

export default profileList;
