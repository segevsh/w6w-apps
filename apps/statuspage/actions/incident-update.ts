import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  COMPONENT_STATUSES,
  INCIDENT_IMPACTS,
  INCIDENT_STATUSES,
  json,
  StatuspageClient,
} from "../lib/client.ts";
import { PAGE_PARAM } from "../lib/params.ts";

/**
 * `PATCH /pages/{page}/incidents/{incident}` — post an update to an open
 * incident.
 *
 * The rhythm a status page exists for: `investigating` → `identified` →
 * `monitoring` → `resolved`, each with a paragraph saying what changed. Each
 * PATCH carrying a `body` appends an **update**, which is what subscribers
 * receive and what the incident's timeline shows — so an update with no body
 * changes the status silently, which is rarely what was meant.
 *
 * Not idempotent, and that is the point: two identical calls post two updates
 * to the timeline and, if notifications are on, send two notifications. A
 * retried workflow should re-read the incident rather than re-post.
 *
 * `deliver_notifications` is per update, not per incident — which is what makes
 * the usual pattern work: publish quietly, then notify once on the update that
 * is worth interrupting somebody for.
 */
const action: ActionDefinition = {
  key: "incident-update",
  type: "perform",
  resource: "incident",
  title: "Update incident",
  description:
    "Post an update to an open incident. A PATCH with a body appends to the timeline and is " +
    "what subscribers receive — one without changes the status silently.",
  idempotent: false,
  params: [
    {
      key: "incidentId",
      label: "Incident ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Leave unchanged" },
        ...INCIDENT_STATUSES,
        { value: "in_progress", label: "In progress — maintenance underway" },
        { value: "verifying", label: "Verifying — maintenance done, checking" },
        { value: "completed", label: "Completed — maintenance over" },
      ],
    },
    {
      key: "body",
      label: "Update Body",
      type: "text",
      default: "",
      hint: "What changed. Without this the status moves with no explanation on the timeline.",
    },
    {
      key: "impact",
      label: "Impact",
      type: "select",
      default: "",
      advanced: true,
      options: [{ value: "", label: "Leave unchanged" }, ...INCIDENT_IMPACTS],
    },
    {
      key: "componentStatuses",
      label: "Component Statuses",
      type: "json",
      default: "",
      hint: "Move components in the same request as the update.",
    },
    {
      key: "deliverNotifications",
      label: "Notify Subscribers",
      type: "boolean",
      default: false,
      hint: "Per UPDATE, not per incident — which is how a workflow publishes quietly and then " +
        "notifies once, on the update worth interrupting somebody for.",
    },
    PAGE_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Incident ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "incident_updates", type: "array", label: "Timeline" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const incidentId = String(p.incidentId ?? "").trim();
    if (!incidentId) throw new Error("`incidentId` is required");

    const status = String(p.status ?? "");
    const body = String(p.body ?? "").trim();
    const componentStatuses = json(p.componentStatuses, "componentStatuses");
    if (!status && !body && !componentStatuses && !String(p.impact ?? "")) {
      throw new Error(
        "nothing to update — give a status, a body, an impact, or component statuses",
      );
    }
    if (componentStatuses && typeof componentStatuses === "object") {
      for (const [id, value] of Object.entries(componentStatuses as Record<string, unknown>)) {
        if (!COMPONENT_STATUSES.some((s) => s.value === String(value))) {
          throw new Error(`component ${id} has an unknown status "${value}"`);
        }
      }
    }
    if (status && !body) {
      ctx.log(
        "warn",
        "changing an incident's status without a body posts no explanation to the timeline",
        { incidentId, status },
      );
    }

    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);

    return await client.request(
      `/pages/${encodeURIComponent(pageId)}/incidents/${encodeURIComponent(incidentId)}`,
      {
        method: "PATCH",
        body: {
          incident: compact({
            status: status || undefined,
            body: body || undefined,
            impact_override: String(p.impact ?? "") || undefined,
            components: componentStatuses,
            deliver_notifications: p.deliverNotifications === true,
          }),
        },
      },
    );
  },
};

export default action;
