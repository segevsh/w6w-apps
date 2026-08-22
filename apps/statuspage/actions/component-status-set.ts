import type { ActionDefinition } from "@w6w/types";
import { COMPONENT_STATUSES, StatuspageClient } from "../lib/client.ts";
import { PAGE_PARAM } from "../lib/params.ts";

/**
 * `PATCH /pages/{page}/components/{component}` — say that one component is
 * healthy or not.
 *
 * The smallest useful thing this app does, and the one a monitoring workflow
 * calls: a check fails, the component goes to `major_outage`; it recovers, the
 * component goes back to `operational`.
 *
 * ## Setting a status is not opening an incident
 *
 * A component turning red changes the coloured dot and the page's headline
 * indicator. It posts **no update, sends no subscriber notification and creates
 * no incident** — so customers see that something is wrong and are told nothing
 * about it. That silence is usually worse than the outage.
 *
 * `incident-create` does both at once: it opens an incident *and* moves the
 * components, in a single request. On an API limited to one request per second
 * that is also the faster path, and it is the one to prefer whenever a human
 * would want to know what is happening.
 *
 * This action is the right one for the other case: an automated recovery, a
 * degradation not worth a notification, or closing the loop after the incident
 * itself was already published.
 *
 * Idempotent: setting a status the component already has is a no-op.
 */
const action: ActionDefinition = {
  key: "component-status-set",
  type: "perform",
  resource: "component",
  title: "Set component status",
  description:
    "Change one component's status. Note this posts NO update and notifies nobody — use Create " +
    "Incident when customers should be told why.",
  idempotent: true,
  params: [
    {
      key: "componentId",
      label: "Component ID",
      type: "string",
      required: true,
      default: "",
      hint: "`component-list` maps names to ids.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      default: "operational",
      options: COMPONENT_STATUSES,
    },
    PAGE_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Component ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const componentId = String(p.componentId ?? "").trim();
    if (!componentId) throw new Error("`componentId` is required");
    const status = String(p.status ?? "");
    if (!COMPONENT_STATUSES.some((s) => s.value === status)) {
      throw new Error(
        `\`status\` must be one of ${COMPONENT_STATUSES.map((s) => s.value).join(", ")}`,
      );
    }

    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);
    ctx.log(status === "operational" ? "info" : "warn", "setting a Statuspage component status", {
      componentId,
      status,
    });

    return await client.request(
      `/pages/${encodeURIComponent(pageId)}/components/${encodeURIComponent(componentId)}`,
      { method: "PATCH", body: { component: { status } } },
    );
  },
};

export default action;
