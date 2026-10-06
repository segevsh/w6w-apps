import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery, privateParam } from "../lib/params.ts";

interface Input extends ListInput {
  path?: string;
  mode?: string;
  status?: string;
  includeTags?: boolean;
  pruneConfig?: boolean;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description:
    "List the campaigns on the connected Raisely organisation, newest first unless sorted.",
  params: [
    { key: "path", label: "Path", type: "string", hint: "Only campaigns with this path." },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [{ value: "LIVE", label: "Live" }, { value: "TEST", label: "Test" }],
    },
    { key: "status", label: "Status", type: "string", hint: "Filter by campaign status value." },
    { key: "includeTags", label: "Include tags", type: "boolean" },
    {
      key: "pruneConfig",
      label: "Prune config",
      type: "boolean",
      hint: "Leave out campaign.config to shrink the response (private queries only).",
    },
    privateParam(),
    ...listParams(),
  ],
  output: [
    { key: "data", type: "array", label: "List Campaigns" },
    {
      key: "pagination",
      type: "object",
      label: "Pagination (total, pages, offset, limit, nextUrl)",
    },
  ],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).list("/campaigns", {
      query: {
        ...listQuery(input),
        ...compact({
          path: input.path,
          mode: input.mode,
          status: input.status,
          includeTags: input.includeTags,
          pruneConfig: input.pruneConfig,
        }),
      },
    });
  },
};

export default campaignList;
