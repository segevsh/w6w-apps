import type { ActionDefinition } from "@w6w/types";
import { csv, flattenAll, pagination, query, TerraformClient } from "../lib/client.ts";
import { WORKSPACE_PARAMS } from "../lib/params.ts";
import { resolveWorkspace } from "../lib/workspaces.ts";
import { AWAITING_DECISION } from "./run-get.ts";

/**
 * `GET /api/v2/workspaces/{id}/runs` — a workspace's run history, newest first.
 *
 * ## The useful question this answers is "is anything stuck"
 *
 * A run sitting in `planned` is waiting for a human to confirm an apply, and
 * it waits forever. A workspace with several of those has a queue that is not
 * moving, and every new run sits behind them. This action counts them
 * separately from the running ones for that reason.
 *
 * ## Filtering is by status, and the names are the raw ones
 *
 * `filter[status]` takes a comma-separated list of the API's own status
 * strings — `pending`, `planning`, `planned`, `applied`,
 * `planned_and_finished`, `errored`, `discarded`, `canceled`. They are
 * snake_case, unlike the kebab-case attribute names in the same response.
 */
const action: ActionDefinition = {
  key: "run-list",
  type: "search",
  resource: "run",
  title: "List runs",
  description:
    "A workspace's runs, newest first, with a count of how many are AWAITING a person — those " +
    "hold the queue, and every new run sits behind them.",
  params: [
    ...WORKSPACE_PARAMS,
    {
      key: "status",
      label: "Status",
      type: "string",
      default: "",
      hint: "Comma-separated raw statuses: `pending`, `planned`, `applied`, " +
        "`planned_and_finished`, `errored`. Note these are snake_case while the attributes in " +
        "the same response are kebab-case.",
    },
    {
      key: "operation",
      label: "Operation",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Any" },
        { value: "plan_only", label: "Plan only" },
        { value: "plan_and_apply", label: "Plan and apply" },
        { value: "destroy", label: "Destroy" },
      ],
    },
    { key: "pageSize", label: "Page Size", type: "number", default: 20 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "runs", type: "array", label: "The runs" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "ids", type: "array", label: "Just the run ids" },
    { key: "awaitingCount", type: "number", label: "How many are waiting for a person" },
    { key: "latest", type: "object", label: "The most recent run" },
    { key: "totalCount", type: "number", label: "Across all pages" },
    { key: "nextPage", type: "number", label: "Absent on the last page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const ref = await resolveWorkspace(p, ctx);

    const document = await new TerraformClient(ctx).request(
      `/api/v2/workspaces/${encodeURIComponent(ref.id)}/runs`,
      {
        query: query({
          "filter[status]": csv(p.status)?.join(","),
          "filter[operation]": p.operation,
          "page[size]": Math.min(100, Math.max(1, Number(p.pageSize ?? 20))),
          "page[number]": Math.max(1, Number(p.page ?? 1)),
        }),
      },
    );

    const runs = flattenAll(document.data as never);
    const page = pagination(document.meta);
    const awaitingCount =
      runs.filter((run) => AWAITING_DECISION.has(String(run["status"] ?? ""))).length;

    if (awaitingCount > 0) {
      ctx.log("warn", "Terraform runs are waiting for a person and holding the queue", {
        workspaceId: ref.id,
        awaitingCount,
      });
    }

    return {
      runs,
      count: runs.length,
      ids: runs.map((run) => run.id).filter(Boolean),
      awaitingCount,
      latest: runs[0],
      totalCount: page.totalCount,
      nextPage: page.nextPage,
    };
  },
};

export default action;
