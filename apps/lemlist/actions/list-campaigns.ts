import type { ActionDefinition } from "@w6w/types";
import {
  CAMPAIGN_STATUS_OPTIONS,
  LemlistClient,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  SORT_PARAMS,
  type SortInput,
  sortQuery,
} from "../lib/client.ts";

interface Input extends PageInput, SortInput {
  status?: "running" | "draft" | "archived" | "ended" | "paused" | "errors";
  createdBy?: string;
  version?: "v2";
}

/**
 * `GET /campaigns`.
 *
 * Returns a bare JSON **array** of campaigns, not an envelope — there is no
 * `total` and no `hasMore`, so "is there another page" is answered by getting
 * back fewer rows than `limit`.
 */
const listCampaigns: ActionDefinition<Input> = {
  key: "list-campaigns",
  type: "search",
  resource: "campaign",
  title: "List Campaigns",
  description: "List the team's campaigns, one offset page at a time. Filter by status or creator.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: CAMPAIGN_STATUS_OPTIONS,
      hint:
        "A campaign can be in several statuses at once (e.g. paused with errors), so filtering " +
        "on one does not partition the list.",
    },
    {
      key: "createdBy",
      label: "Created by",
      type: "string",
      placeholder: "usr_QG9E94KvTmC7KWqzs",
      hint: "User id (`usr_...`). Returns only campaigns created by that user.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Campaigns per page. lemlist defaults to 100; maximum 100.",
    },
    ...PAGE_PARAMS.filter((p) => p.key !== "limit"),
    ...SORT_PARAMS,
    {
      key: "version",
      label: "API version",
      type: "select",
      options: [{ value: "v2", label: "v2" }],
      default: "v2",
      hint: "lemlist schema-defaults this to `v2`, the latest response shape. Leave it alone.",
    },
  ],
  output: [{ key: "campaigns", type: "array", label: "Campaigns" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request<unknown[]>("/campaigns", {
      query: {
        ...pageQuery(input),
        ...sortQuery(input),
        status: input.status,
        createdBy: input.createdBy,
        version: input.version ?? "v2",
      },
    });
  },
};

export default listCampaigns;
