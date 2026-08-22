import type { ActionDefinition } from "@w6w/types";
import { csv, flattenAll, pagination, query, TerraformClient } from "../lib/client.ts";

/**
 * `GET /api/v2/organizations/{org}/workspaces` — what this organisation runs.
 *
 * ## The two attributes that decide how dangerous a workspace is
 *
 * - **`auto-apply`** — when true, a plan that succeeds **applies itself**.
 *   Creating a run against such a workspace changes infrastructure with no
 *   confirmation step anywhere in the sequence. This action counts them,
 *   because it is the single most useful thing to know before pointing an
 *   automation at an organisation.
 * - **`locked`** — a locked workspace accepts runs and never starts them. They
 *   queue silently, and the workflow that created one waits for a state it
 *   will not reach.
 *
 * ## Search is by prefix, and tag filtering is AND
 *
 * `search[name]` matches a **substring** of the name. `search[tags]` takes a
 * comma-separated list and requires **all** of them, so a long list usually
 * returns nothing — the same trap as tag filters elsewhere.
 */
const action: ActionDefinition = {
  key: "workspace-list",
  type: "search",
  resource: "workspace",
  title: "List workspaces",
  description: "An organisation's workspaces, with a count of how many AUTO-APPLY — those change " +
    "infrastructure from a single run with no confirmation — and how many are locked.",
  params: [
    {
      key: "organization",
      label: "Organization",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "search",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "A substring of the workspace name.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "Comma-separated. ALL of them must match, so a long list usually returns nothing.",
    },
    {
      key: "excludeTags",
      label: "Excluding Tags",
      type: "string",
      default: "",
      advanced: true,
    },
    { key: "pageSize", label: "Page Size", type: "number", default: 20 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "workspaces", type: "array", label: "The workspaces" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "ids", type: "array", label: "Just the workspace ids" },
    { key: "autoApplyCount", type: "number", label: "How many apply without confirmation" },
    { key: "lockedCount", type: "number", label: "How many will queue runs and not start them" },
    { key: "totalCount", type: "number", label: "Across all pages" },
    { key: "nextPage", type: "number", label: "Absent on the last page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organization = String(p.organization ?? "").trim();
    if (!organization) throw new Error("`organization` is required");

    const document = await new TerraformClient(ctx).request(
      `/api/v2/organizations/${encodeURIComponent(organization)}/workspaces`,
      {
        query: query({
          "search[name]": p.search,
          "search[tags]": csv(p.tags)?.join(","),
          "search[exclude-tags]": csv(p.excludeTags)?.join(","),
          "page[size]": Math.min(100, Math.max(1, Number(p.pageSize ?? 20))),
          "page[number]": Math.max(1, Number(p.page ?? 1)),
        }),
      },
    );

    const workspaces = flattenAll(document.data as never);
    const page = pagination(document.meta);
    const autoApplyCount = workspaces.filter((ws) => ws["auto-apply"] === true).length;
    const lockedCount = workspaces.filter((ws) => ws["locked"] === true).length;

    ctx.log("info", "listed Terraform workspaces", {
      count: workspaces.length,
      autoApplyCount,
      lockedCount,
    });

    return {
      workspaces,
      count: workspaces.length,
      ids: workspaces.map((ws) => ws.id).filter(Boolean),
      autoApplyCount,
      lockedCount,
      totalCount: page.totalCount,
      nextPage: page.nextPage,
    };
  },
};

export default action;
