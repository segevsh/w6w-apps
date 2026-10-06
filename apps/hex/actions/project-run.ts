import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, HexClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `POST /v1/projects/{projectId}/runs` — run the LATEST PUBLISHED version of a project.
 *
 * ## Not idempotent
 *
 * The endpoint takes no idempotency key; every call starts a new run (and spends
 * kernel time), so the runtime must not retry it.
 *
 * ## The answer is a run handle, not a result
 *
 * The 201 body is `{ projectId, runId, runUrl, runStatusUrl, traceId, projectVersion }`.
 * Poll Get Run Status with `runId` until `status` is terminal.
 *
 * ## `updateCache` is never sent
 *
 * Hex deprecated `updateCache` in favour of `updatePublishedResults` (default
 * false) and `useCachedSqlResults` (default true). This action only exposes the
 * new pair, and only sends what the caller set, so the vendor's defaults apply.
 */
interface Input {
  projectId: string;
  inputParams?: unknown;
  dryRun?: boolean;
  updatePublishedResults?: boolean;
  useCachedSqlResults?: boolean;
  viewId?: string;
  notifications?: unknown;
}

const projectRun: ActionDefinition<Input> = {
  key: "project-run",
  type: "perform",
  resource: "run",
  title: "Run Project",
  description:
    "Trigger a run of a project's latest published version and return the run handle immediately.",
  idempotent: false,
  params: [
    projectIdParam,
    {
      key: "inputParams",
      label: "Input parameters",
      type: "json",
      hint: 'Published app input values keyed by variable name, e.g. {"region": "emea"}.',
    },
    {
      key: "updatePublishedResults",
      label: "Update published results",
      type: "boolean",
      hint: "Write the run's results to the published app. Hex's default is false.",
    },
    {
      key: "useCachedSqlResults",
      label: "Use cached SQL results",
      type: "boolean",
      hint: "Let SQL cells reuse cached results. Hex's default is true.",
    },
    {
      key: "dryRun",
      label: "Dry run",
      type: "boolean",
      hint: "Validate the request without starting a run.",
    },
    {
      key: "viewId",
      label: "Saved view ID",
      type: "string",
      hint: "Use the inputs of this saved view.",
    },
    {
      key: "notifications",
      label: "Notifications",
      type: "json",
      hint:
        "Array of { type: SUCCESS|FAILURE|ALL, includeSuccessScreenshot, slackChannelIds, userIds, groupIds, subject, body }.",
    },
  ],
  output: [
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "runId", type: "string", label: "Run ID" },
    { key: "runUrl", type: "string", label: "Run URL" },
    { key: "runStatusUrl", type: "string", label: "Run status URL" },
    { key: "projectVersion", type: "number", label: "Published version that ran" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "starting Hex project run", { projectId: input.projectId });
    return await new HexClient(ctx).json(`/projects/${encodeId(input.projectId)}/runs`, {
      method: "POST",
      body: compact({
        inputParams: asOptionalJson(input.inputParams, "Input parameters"),
        dryRun: input.dryRun,
        updatePublishedResults: input.updatePublishedResults,
        useCachedSqlResults: input.useCachedSqlResults,
        viewId: input.viewId,
        notifications: asOptionalJson(input.notifications, "Notifications"),
      }),
    });
  },
};

export default projectRun;
