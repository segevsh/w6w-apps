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
 * `POST /pages/{page}/incidents` — tell customers something is wrong.
 *
 * ## It moves the components too, in the same request
 *
 * `components` sets each named component's status and `component_ids` lists the
 * ones the incident is about. Doing both here rather than calling
 * `component-status-set` in a loop matters for two reasons: the page shows one
 * coherent change instead of several, and Statuspage allows **one request per
 * second**, so a loop over six components is six seconds during which the page
 * is half-updated.
 *
 * ## `deliver_notifications` is the choice worth making deliberately
 *
 * On, subscribers are emailed, texted and pushed *now*. Off, the incident
 * appears on the page silently. Neither is right in general: a false alarm
 * emailed to every customer cannot be recalled, and a genuine outage published
 * silently defeats the point of having a status page.
 *
 * It defaults to **off** here, so an automated first post cannot page an entire
 * customer base on a flapping check, and the notification is a decision the
 * workflow makes on purpose — often on the *second* update, once a human has
 * confirmed.
 *
 * ## Realtime versus scheduled
 *
 * A realtime incident starts at `investigating`. A scheduled maintenance is a
 * different lifecycle (`scheduled` → `in_progress` → `verifying` →
 * `completed`) and needs `scheduled_for` / `scheduled_until`; this action
 * accepts those, which is what turns it into a maintenance window rather than
 * an outage.
 */
const action: ActionDefinition = {
  key: "incident-create",
  type: "perform",
  resource: "incident",
  title: "Create incident",
  description:
    "Open an incident and move its components in one request. Subscriber notifications are OFF " +
    "by default — an automated first post should not page every customer.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Title",
      type: "string",
      required: true,
      default: "",
      placeholder: "Elevated error rates on the API",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      default: "investigating",
      options: [
        ...INCIDENT_STATUSES,
        { value: "scheduled", label: "Scheduled — a maintenance window" },
      ],
    },
    {
      key: "impact",
      label: "Impact",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Let Statuspage infer it from the components" },
        ...INCIDENT_IMPACTS,
      ],
      hint: "Drives the page's headline indicator. Left empty, Statuspage derives it from the " +
        "component statuses.",
    },
    {
      key: "body",
      label: "Update Body",
      type: "text",
      default: "",
      hint: "The first update customers read. Markdown is supported.",
    },
    {
      key: "componentIds",
      label: "Affected Component IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Which components this incident is about.",
    },
    {
      key: "componentStatuses",
      label: "Component Statuses",
      type: "json",
      default: "",
      placeholder: '{"abc123":"major_outage"}',
      hint: "Set each component's status in the SAME request — far better than a loop, on an " +
        "API limited to one request per second.",
    },
    {
      key: "deliverNotifications",
      label: "Notify Subscribers",
      type: "boolean",
      default: false,
      hint: "⚠️ On, this emails and texts every subscriber immediately, and cannot be recalled. " +
        "Off by default so an automated first post cannot page everyone on a flapping check.",
    },
    {
      key: "scheduledFor",
      label: "Scheduled For",
      type: "datetime",
      default: "",
      advanced: true,
      hint: "Maintenance windows only — with Scheduled Until, this becomes a maintenance rather " +
        "than an outage.",
    },
    {
      key: "scheduledUntil",
      label: "Scheduled Until",
      type: "datetime",
      default: "",
      advanced: true,
    },
    PAGE_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Incident ID" },
    { key: "name", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "impact", type: "string", label: "Impact" },
    { key: "shortlink", type: "string", label: "Short link" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const componentStatuses = json(p.componentStatuses, "componentStatuses");
    if (componentStatuses && typeof componentStatuses === "object") {
      for (const [id, value] of Object.entries(componentStatuses as Record<string, unknown>)) {
        if (!COMPONENT_STATUSES.some((s) => s.value === String(value))) {
          throw new Error(
            `component ${id} has an unknown status "${value}" — expected one of ` +
              COMPONENT_STATUSES.map((s) => s.value).join(", "),
          );
        }
      }
    }

    const scheduledFor = String(p.scheduledFor ?? "").trim();
    const scheduledUntil = String(p.scheduledUntil ?? "").trim();
    if (Boolean(scheduledFor) !== Boolean(scheduledUntil)) {
      throw new Error(
        "a maintenance window needs both `scheduledFor` and `scheduledUntil` — one alone is not " +
          "a window",
      );
    }

    const deliver = p.deliverNotifications === true;
    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);

    ctx.log("warn", "opening a Statuspage incident", {
      status: p.status,
      notifying: deliver,
    });

    return await client.request(`/pages/${encodeURIComponent(pageId)}/incidents`, {
      method: "POST",
      body: {
        incident: compact({
          name,
          status: String(p.status ?? "investigating"),
          impact_override: String(p.impact ?? "") || undefined,
          body: p.body,
          component_ids: (p.componentIds as string || "").split(",").map((s) => s.trim())
            .filter(Boolean),
          components: componentStatuses,
          // Always explicit: the difference between telling everybody and
          // telling nobody should never be decided by an omitted field.
          deliver_notifications: deliver,
          scheduled_for: scheduledFor || undefined,
          scheduled_until: scheduledUntil || undefined,
        }),
      },
    });
  },
};

export default action;
