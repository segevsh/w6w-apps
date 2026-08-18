import type { ActionDefinition } from "@w6w/types";
import { compact, csv, WorkOSClient } from "../lib/client.ts";

/**
 * `POST /audit_logs/exports` — ask for a customer's audit log as a file.
 *
 * There is no endpoint that *reads* audit log events back. Retrieval is an
 * export: you request a date range, WorkOS assembles it, and the job's `url`
 * appears when its `state` reaches `ready`. That shape is why this is two
 * actions rather than one — the export takes long enough that a workflow has to
 * come back for it.
 *
 * The usual reason to run it is a customer asking for their own records, or a
 * compliance review that wants evidence rather than a dashboard.
 *
 * `range_start` and `range_end` are both required, so an unbounded "everything"
 * export does not exist.
 */
const action: ActionDefinition = {
  key: "audit-log-export-create",
  type: "perform",
  resource: "audit-log",
  title: "Start an audit log export",
  description:
    "Ask WorkOS to assemble a customer's audit log for a date range. There is no read endpoint " +
    "— an export is how events come back, and it finishes asynchronously.",
  idempotent: false,
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "rangeStart",
      label: "From",
      type: "datetime",
      required: true,
      default: "",
      hint: "Required — WorkOS has no unbounded export.",
    },
    { key: "rangeEnd", label: "To", type: "datetime", required: true, default: "" },
    {
      key: "actions",
      label: "Actions",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated event actions to include. Blank means all of them.",
    },
    {
      key: "targets",
      label: "Target Types",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated target types.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Export ID — pass it to `audit-log-export-get`" },
    { key: "state", type: "string", label: "State" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    const rangeStart = String(p.rangeStart ?? "").trim();
    const rangeEnd = String(p.rangeEnd ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");
    if (!rangeStart || !rangeEnd) {
      throw new Error(
        "both `rangeStart` and `rangeEnd` are required — WorkOS has no unbounded export",
      );
    }

    const job = await new WorkOSClient(ctx).request<{ id?: string }>(
      "/audit_logs/exports",
      {
        method: "POST",
        body: compact({
          organization_id: organizationId,
          range_start: rangeStart,
          range_end: rangeEnd,
          actions: csv(p.actions),
          targets: csv(p.targets),
        }),
      },
    );
    ctx.log("info", "started a WorkOS audit log export", { exportId: job?.id, organizationId });
    return job;
  },
};

export default action;
