import type { ActionDefinition } from "@w6w/types";
import { compact, json, StatuspageClient } from "../lib/client.ts";
import { PAGE_PARAM } from "../lib/params.ts";

/**
 * Resolve an incident — and put its components back.
 *
 * Its own action rather than `incident-update` with `status: resolved`, because
 * resolving is where the most common status-page mistake happens: the incident
 * closes, and the components are left red. The page then shows "all resolved"
 * above a row of outage dots, which reads as broken tooling and undermines
 * every future update.
 *
 * So this sets the components back to `operational` in the same request,
 * defaulting to every component the incident named. Passing explicit component
 * statuses overrides that, for a partial recovery where one component genuinely
 * is still degraded.
 *
 * Idempotent: resolving an incident that is already resolved changes nothing —
 * though it does append another update if a body is given.
 */
const action: ActionDefinition = {
  key: "incident-resolve",
  type: "perform",
  resource: "incident",
  title: "Resolve incident",
  description:
    "Close an incident and return its components to operational in the same request — which is " +
    "the step most often forgotten, leaving a resolved page covered in red dots.",
  idempotent: true,
  params: [
    {
      key: "incidentId",
      label: "Incident ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "body",
      label: "Final Update",
      type: "text",
      default: "",
      hint: "The last thing customers read about this. Worth writing.",
    },
    {
      key: "restoreComponents",
      label: "Return Components To Operational",
      type: "boolean",
      default: true,
      hint: "Every component the incident named goes back to `operational`. Turn off for a " +
        "partial recovery and set the statuses explicitly instead.",
    },
    {
      key: "componentStatuses",
      label: "Component Statuses",
      type: "json",
      default: "",
      advanced: true,
      hint: "Explicit statuses, for a partial recovery. Overrides the blanket restore.",
    },
    {
      key: "deliverNotifications",
      label: "Notify Subscribers",
      type: "boolean",
      default: false,
      hint: "The resolution is usually worth sending, if anything about the incident was.",
    },
    PAGE_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Incident ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "resolved_at", type: "string", label: "Resolved at" },
    { key: "restoredComponents", type: "array", label: "Components returned to operational" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const incidentId = String(p.incidentId ?? "").trim();
    if (!incidentId) throw new Error("`incidentId` is required");

    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);

    let components = json(p.componentStatuses, "componentStatuses") as
      | Record<string, string>
      | undefined;
    let restored: string[] = [];

    if (!components && p.restoreComponents !== false) {
      // Read the incident to learn which components it named — the whole point
      // of this action is not leaving them red.
      const incident = await client.request<{ components?: Array<{ id?: string }> }>(
        `/pages/${encodeURIComponent(pageId)}/incidents/${encodeURIComponent(incidentId)}`,
      );
      restored = (incident?.components ?? []).map((c) => String(c.id)).filter(Boolean);
      if (restored.length > 0) {
        components = Object.fromEntries(restored.map((id) => [id, "operational"]));
      }
    } else if (components) {
      restored = Object.keys(components);
    }

    ctx.log("info", "resolving a Statuspage incident", {
      incidentId,
      restoring: restored.length,
    });

    const result = await client.request(
      `/pages/${encodeURIComponent(pageId)}/incidents/${encodeURIComponent(incidentId)}`,
      {
        method: "PATCH",
        body: {
          incident: compact({
            status: "resolved",
            body: p.body,
            components,
            deliver_notifications: p.deliverNotifications === true,
          }),
        },
      },
    );
    return { ...(result as Record<string, unknown>), restoredComponents: restored };
  },
};

export default action;
