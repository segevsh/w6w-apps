import type { ActionDefinition } from "@w6w/types";
import { WorkOSClient } from "../lib/client.ts";

/**
 * `GET /audit_logs/exports/{id}` — has the export finished, and where is it?
 *
 * `state` moves `pending` → `ready`, and only then does `url` appear. A
 * workflow polls this after `audit-log-export-create`.
 *
 * **The URL is a pre-signed download that expires**, and it is a customer's
 * complete audit trail — every action, actor and target. It is the single most
 * sensitive thing this app can produce, so it is returned but never logged, and
 * `ready` is reported as a boolean so a polling step can branch without
 * touching the URL at all.
 */
const action: ActionDefinition = {
  key: "audit-log-export-get",
  type: "read",
  resource: "audit-log",
  title: "Get an audit log export",
  description:
    "Whether an export has finished, and its download URL. The URL is a pre-signed link to a " +
    "customer's complete audit trail — returned, never logged.",
  params: [
    { key: "exportId", label: "Export ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "state", type: "string", label: "State — pending or ready" },
    { key: "ready", type: "boolean", label: "Finished, so `url` is present" },
    { key: "url", type: "string", label: "Pre-signed download, which expires" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.exportId ?? "").trim();
    if (!id) throw new Error("`exportId` is required");

    const job = await new WorkOSClient(ctx).request<{ state?: string }>(
      `/audit_logs/exports/${encodeURIComponent(id)}`,
    );
    const ready = job?.state === "ready";
    // The state, never the URL.
    ctx.log("info", "checked a WorkOS audit log export", { exportId: id, state: job?.state });
    return { ...job, ready };
  },
};

export default action;
