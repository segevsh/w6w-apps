import type { ActionDefinition } from "@w6w/types";
import { GrafanaClient } from "../lib/client.ts";

interface Input {
  query?: string;
  tag?: string;
  folderUIDs?: string;
  starred?: boolean;
  limit?: number;
  page?: number;
}

/**
 * `GET /api/search?type=dash-db` — Grafana's folder/dashboard search API,
 * narrowed to dashboards only (`type=dash-db` excludes folders, which the
 * same endpoint also returns). Confirmed against Grafana's own Folder/
 * Dashboard Search HTTP API docs.
 */
const dashboardList: ActionDefinition<Input> = {
  key: "dashboard-list",
  type: "search",
  resource: "dashboard",
  title: "List Dashboards",
  description: "Search dashboards by title, tag, or folder.",
  params: [
    { key: "query", label: "Search query", type: "string", hint: "Matches dashboard title." },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      hint: "Comma-separated list of tags to filter by.",
    },
    {
      key: "folderUIDs",
      label: "Folder UIDs",
      type: "string",
      hint: "Comma-separated list of folder UIDs to search within.",
    },
    { key: "starred", label: "Starred only", type: "boolean" },
    { key: "limit", label: "Limit", type: "number", hint: "Max results (max 5000, default 1000)." },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number; limit is the page size.",
    },
  ],
  output: [{ key: "dashboards", type: "array", label: "Dashboards" }],

  execute(input, ctx) {
    const client = GrafanaClient.fromConnection(ctx);
    return client.request("/search", {
      query: {
        type: "dash-db",
        query: input.query,
        tag: input.tag,
        folderUIDs: input.folderUIDs,
        starred: input.starred,
        limit: input.limit,
        page: input.page,
      },
    });
  },
};

export default dashboardList;
