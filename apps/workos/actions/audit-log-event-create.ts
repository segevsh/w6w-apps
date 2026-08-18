import type { ActionDefinition } from "@w6w/types";
import { compact, json, WorkOSClient } from "../lib/client.ts";

/**
 * `POST /audit_logs/events` — write an event into a customer's audit log.
 *
 * ## Why this is worth automating
 *
 * Audit logs are an enterprise checklist item that your product has to produce
 * and the customer's security team has to consume. WorkOS holds them and can
 * stream them to the customer's own SIEM, which means an event written here
 * ends up in their Splunk without you building an integration.
 *
 * A workflow is a good place to write them precisely because workflows do the
 * things worth logging — the export somebody ran, the permission somebody
 * granted, the record somebody deleted.
 *
 * ## Three rules that are easy to break and hard to notice
 *
 * 1. **The schema is registered in advance.** An event `action` must already
 *    exist in the WorkOS dashboard, with its metadata fields declared. An
 *    unregistered action or an undeclared metadata key is rejected — which is
 *    good, and worth knowing before a workflow fails in production.
 * 2. **`occurred_at` is yours to set.** WorkOS records when the thing happened,
 *    not when you got around to telling it, so a retry or a batch replay
 *    preserves the real order. Left blank this stamps the current time.
 * 3. **An audit log is append-only.** There is no edit and no delete, so a
 *    wrong event stays wrong forever and personal data written by mistake
 *    cannot be taken back out. Metadata goes to the customer's security team;
 *    put ids in it, not contents.
 */
const action: ActionDefinition = {
  key: "audit-log-event-create",
  type: "perform",
  resource: "audit-log",
  title: "Write an audit log event",
  description:
    "Record something in a customer's audit log, which WorkOS can stream to their own SIEM. " +
    "Append-only — a wrong event cannot be edited or deleted.",
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
      key: "action",
      label: "Action",
      type: "string",
      required: true,
      default: "",
      placeholder: "user.signed_in",
      hint: "Must already be registered as an audit log schema in the WorkOS dashboard — an " +
        "unregistered action is rejected.",
    },
    {
      key: "actorId",
      label: "Actor ID",
      type: "string",
      required: true,
      default: "",
      hint: "Who did it — your own id for them.",
    },
    {
      key: "actorType",
      label: "Actor Type",
      type: "string",
      required: true,
      default: "user",
      placeholder: "user",
    },
    {
      key: "targetId",
      label: "Target ID",
      type: "string",
      required: true,
      default: "",
      hint: "What it was done to.",
    },
    { key: "targetType", label: "Target Type", type: "string", required: true, default: "" },
    {
      key: "occurredAt",
      label: "Occurred At",
      type: "datetime",
      default: "",
      hint: "When it actually happened, not when this ran — so a replay keeps the real order. " +
        "Blank uses now.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      default: "",
      hint: "Only keys declared on the registered schema. This reaches the customer's security " +
        "team and cannot be removed later — ids, not contents.",
    },
    {
      key: "version",
      label: "Schema Version",
      type: "number",
      default: 1,
      advanced: true,
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Recorded" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const organizationId = String(p.organizationId ?? "").trim();
    const actionName = String(p.action ?? "").trim();
    if (!organizationId) throw new Error("`organizationId` is required");
    if (!actionName) throw new Error("`action` is required");
    const actorId = String(p.actorId ?? "").trim();
    const targetId = String(p.targetId ?? "").trim();
    if (!actorId) throw new Error("`actorId` is required");
    if (!targetId) throw new Error("`targetId` is required");
    const targetType = String(p.targetType ?? "").trim();
    if (!targetType) throw new Error("`targetType` is required");

    const occurredAt = String(p.occurredAt ?? "").trim() || new Date().toISOString();

    // The action and the organization; never the metadata, which is the caller's
    // payload and reaches the customer's security team on its own route.
    ctx.log("info", "writing a WorkOS audit log event", { organizationId, action: actionName });

    const result = await new WorkOSClient(ctx).request(
      "/audit_logs/events",
      {
        method: "POST",
        body: {
          organization_id: organizationId,
          event: compact({
            action: actionName,
            occurred_at: occurredAt,
            version: Number(p.version ?? 1),
            actor: compact({
              id: actorId,
              type: String(p.actorType ?? "user"),
            }),
            targets: [compact({ id: targetId, type: targetType })],
            context: { location: "0.0.0.0" },
            metadata: json(p.metadata, "metadata"),
          }),
        },
      },
    );
    return result ?? { success: true };
  },
};

export default action;
